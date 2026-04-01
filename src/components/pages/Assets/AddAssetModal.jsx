import React, { useState, useRef, useEffect } from 'react';
import { X, Package, Tag, ArrowRightLeft, MessageSquare, Image as ImageIcon, Camera, User, Building2, FileText, UploadCloud, CheckCircle } from 'lucide-react';
import apiService from '../../../services/api';
import { buildFileUrl } from '../../../utils/file';

const AddAssetModal = ({ isOpen, onClose, onAdd }) => {
    const [formData, setFormData] = useState({
        assetName: '',
        assetTag: '',
        receiverName: '',
        exchangeType: 'Issue',
        newAssetId: '',
        remarks: '',
        photos: [], // Preview URLs for display
        vendor: null, // Selected vendor object
        quantity: 1,
        bulkAssets: [{ name: '', tag: '', assetType: '', companyName: '', generation: '', ram: '', hardDisk: '' }], // Array for individual names/tags/specs
        companyName: '',
        generation: '',
        ram: '',
        hardDisk: '',
        procurementType: 'Purchasing', // 'Purchasing' or 'Vendor'
        // Purchasing fields
        purchaseDate: '',
        poNumber: '',
        invoiceNumber: '',
        purchaseCost: '',
        warrantyPeriod: '',
        // Vendor fields
        vendorContact: '',
        deliveryDate: '',
        assetType: '',
        includeCharger: false,
        chargerQuantity: 0,
        includeMouse: false,
        mouseQuantity: 0,
        customFields: {}
    });

    const [addedAssets, setAddedAssets] = useState([]); // Track assets added in this session
    const [step, setStep] = useState('create'); // 'create' | 'prompt' | 'assign'

    // Employee Assignment State
    const [selectedAssets, setSelectedAssets] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [empSearch, setEmpSearch] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [assignLoading, setAssignLoading] = useState(false);
    const [loading, setLoading] = useState(false);

    const fileInputRef = useRef(null);
    const invoiceInputRef = useRef(null);

    // RESTORED STATE
    const [photoFiles, setPhotoFiles] = useState([]); // Actual File objects
    const [invoiceFile, setInvoiceFile] = useState(null); // Actual Invoice File object
    const [vendors, setVendors] = useState([]); // Available vendors
    const [assetTypes, setAssetTypes] = useState([]); // Available asset types
    const [selectedType, setSelectedType] = useState(null); // Full object for configuration

    // Use sample vendors for now
    useEffect(() => {
        if (isOpen) {
            setStep('create');
            setAddedAssets([]);
            setSelectedAssets([]);
            setSelectedEmployee(null);
            setEmpSearch('');
            setLoading(false);

            // Allow re-mount reset
            setPhotoFiles([]);
            setInvoiceFile(null);
            setSelectedType(null);

            // Fetch Vendors
            const fetchVendors = async () => {
                try {
                    const data = await apiService.getVendors();
                    setVendors(Array.isArray(data) ? data : (data.data || []));
                } catch (error) {
                    console.error('Failed to fetch vendors:', error);
                }
            };
            fetchVendors();

            // Fetch Asset Types
            const fetchAssetTypes = async () => {
                try {
                    const data = await apiService.getAssetTypes();
                    setAssetTypes(Array.isArray(data) ? data : (data.data || []));
                } catch (error) {
                    console.error('Failed to fetch asset types:', error);
                }
            };
            fetchAssetTypes();
        }
    }, [isOpen]);

    // Fetch employees for assignment step
    useEffect(() => {
        if (step === 'assign' && employees.length === 0) {
            const fetchEmps = async () => {
                try {
                    // API returns pre-normalized flat array
                    const list = await apiService.getEmployees();
                    setEmployees(list);
                } catch (err) {
                    console.error('Failed to fetch employees', err);
                }
            };
            fetchEmps();
        }
    }, [step]);


    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleVendorChange = (e) => {
        const val = e.target.value;
        const selectedVendor = vendors.find(v => v.vendorId === val);
        setFormData(prev => ({ ...prev, vendor: selectedVendor || null }));
    };

    const handleTypeChange = (e) => {
        const typeId = e.target.value;
        const type = assetTypes.find(t => (t.id || t.typeId) === typeId);
        setSelectedType(type || null);

        // Initialize custom fields if any
        const initialCustom = {};
        if (type?.fields) {
            type.fields.forEach(f => {
                initialCustom[f.name] = '';
            });
        }
        setFormData(prev => ({ ...prev, assetType: typeId, customFields: initialCustom }));
    };

    const handleCustomFieldChange = (name, value) => {
        setFormData(prev => ({
            ...prev,
            customFields: { ...prev.customFields, [name]: value }
        }));
    };

    const handleBulkAssetChange = (index, field, value) => {
        setFormData(prev => {
            const newBulk = [...prev.bulkAssets];
            newBulk[index] = { ...newBulk[index], [field]: value };
            return { ...prev, bulkAssets: newBulk };
        });
    };

    const handleQuantityChange = (e) => {
        const val = parseInt(e.target.value) || 1;
        setFormData(prev => {
            const currentBulk = [...prev.bulkAssets];
            let newBulk;
            if (val > currentBulk.length) {
                // Add new rows
                const additions = Array(val - currentBulk.length).fill(null).map((_, i) => ({
                    name: '',
                    tag: '',
                    companyName: '', generation: '', ram: '', hardDisk: ''
                }));
                newBulk = [...currentBulk, ...additions];
            } else {
                // Truncate rows
                newBulk = currentBulk.slice(0, val);
            }
            return { ...prev, quantity: val, bulkAssets: newBulk };
        });
    };

    const handleAddSingle = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            // Create the asset
            const response = await apiService.createAsset(formData);
            const newAsset = response.data || response; // Adjust based on API response structure

            // Add to session list
            setAddedAssets(prev => [...prev, { ...newAsset, ...formData, id: newAsset.id || `TEMP-${Date.now()}` }]);

            // Reset form for next entry
            setFormData(prev => ({
                ...prev,
                assetName: '',
                assetTag: '',
                receiverName: '',
                photos: [],
                quantity: 1,
                // Keep some fields reusing state if needed, or reset all?
                // Let's reset specific identifying fields but maybe keep vendor/type?
                // For now fully resetting identifying fields
            }));
            setPhotoFiles([]);
            setInvoiceFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (invoiceInputRef.current) invoiceInputRef.current.value = '';

            // Feedback
            // You might want a toast here
            // console.log('Asset added to session:', newAsset);

        } catch (error) {
            console.error('Error adding asset:', error);
            alert('Failed to add asset. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        if (window.confirm('Clear current form data?')) {
            setFormData(prev => ({
                ...prev,
                assetName: '',
                assetTag: '',
                receiverName: '',
                remarks: '',
                photos: [],
                quantity: 1,
                bulkAssets: [{ name: '', tag: '', companyName: '', generation: '', ram: '', hardDisk: '' }],
                // specific purchasing/vendor fields?
                poNumber: '',
                invoiceNumber: '',
                purchaseCost: '',
                warrantyPeriod: '',
                vendorContact: '',
                deliveryDate: '',
                agreementNumber: '',
                securityDeposit: ''
            }));
            setPhotoFiles([]);
            setInvoiceFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (invoiceInputRef.current) invoiceInputRef.current.value = '';
        }
    };

    const handleFinishSession = () => {
        if (addedAssets.length > 0) {
            onAdd({ assets: addedAssets }); // Pass all assets to parent
            onClose();
        } else {
            onClose();
        }
    };

    // Assignment Logic
    const toggleAssetSelection = (assetId) => {
        setSelectedAssets(prev =>
            prev.includes(assetId)
                ? prev.filter(id => id !== assetId)
                : [...prev, assetId]
        );
    };

    const handleBulkAssign = async () => {
        if (!selectedEmployee || selectedAssets.length === 0) return addedAssets;

        setAssignLoading(true);
        try {
            // Iterate and update each selected asset
            const updates = selectedAssets.map(async (assetId) => {
                const asset = addedAssets.find(a => a.id === assetId);
                const updatePayload = {
                    ...asset,
                    receiverName: selectedEmployee.name,
                    assignedDate: new Date().toISOString().split('T')[0],
                    assignedBy: 'Admin',
                    exchangeType: 'Issue',
                };
                return { ...asset, ...updatePayload };
            });

            const updatedList = await Promise.all(updates);

            // Update local state to reflect assignment
            const fullUpdatedList = addedAssets.map(a => {
                const updated = updatedList.find(u => u.id === a.id);
                return updated || a;
            });

            setAddedAssets(fullUpdatedList);
            return fullUpdatedList;
        } catch (error) {
            console.error('Assignment failed:', error);
            throw error;
        } finally {
            setAssignLoading(false);
        }
    };


    const handlePhotoChange = (e) => {
        const files = Array.from(e.target.files);
        if (photoFiles.length + files.length > 4) {
            alert('You can only add up to 4 photos.');
            return;
        }

        // Store actual File objects
        setPhotoFiles(prev => [...prev, ...files]);

        // Create preview URLs for display
        const newPhotos = files.map(file => URL.createObjectURL(file));
        setFormData(prev => ({
            ...prev,
            photos: [...prev.photos, ...newPhotos]
        }));
    };

    const removePhoto = (index) => {
        setFormData(prev => ({
            ...prev,
            photos: prev.photos.filter((_, i) => i !== index)
        }));
        setPhotoFiles(prev => prev.filter((_, i) => i !== index)); // Remove corresponding file object
    };

    const handleInvoiceChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setInvoiceFile(file);
        }
    };

    const removeInvoice = () => {
        setInvoiceFile(null);
        if (invoiceInputRef.current) invoiceInputRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            // Pass essential data plus actual file objects
            const submitData = {
                ...formData,
                vendorId: formData.vendor?.vendorId || '',
                photoFiles,
                invoiceFile
            };

            if (formData.quantity === 1) {
                const response = await apiService.createAsset(submitData);
                const newAsset = response.data || response;
                const assetWithDetails = { ...newAsset, ...formData, id: newAsset.id || `TEMP-${Date.now()}` };
                setAddedAssets([assetWithDetails]);
                setSelectedAssets([assetWithDetails.id]); // Default select the new asset
            } else {
                // For bulk, we'd normally call createAsset for each or a bulk API
                // For now, assuming onAdd handles the bulk creation if not already done
                // But let's assume single for the prompt flow for now as per requirement
                onAdd(submitData);
                resetForm();
                onClose();
                return;
            }

            setStep('prompt');
        } catch (error) {
            console.error('Error adding asset:', error);
            alert('Failed to add asset: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            assetName: '',
            assetTag: '',
            receiverName: '',
            exchangeType: 'Issue',
            newAssetId: '',
            remarks: '',
            photos: [],
            vendor: null,
            quantity: 1,
            bulkAssets: [{ name: '', tag: '', companyName: '', generation: '', ram: '', hardDisk: '' }],
            companyName: '',
            generation: '',
            ram: '',
            hardDisk: '',
            procurementType: 'Purchasing',
            purchaseDate: '',
            poNumber: '',
            invoiceNumber: '',
            purchaseCost: '',
            warrantyPeriod: '',
            vendorContact: '',
            deliveryDate: '',
            assetType: '',
            includeCharger: false,
            chargerQuantity: 0,
            includeMouse: false,
            mouseQuantity: 0,
            customFields: {}
        });
        setPhotoFiles([]);
        setInvoiceFile(null);
        setSelectedType(null);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container scrollable animate-pop" onClick={e => e.stopPropagation()}>
                {step === 'create' && (
                    <>
                        <div className="modal-header">
                            <div className="header-info">
                                <div className="header-icon">
                                    <Package size={20} />
                                </div>
                                <div>
                                    <h3>Onboard New Asset</h3>
                                    <p>Register hardware or software assets to the inventory.</p>
                                </div>
                            </div>
                            <button className="close-btn" onClick={onClose}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-sections">
                                <div className="form-section">
                                    <h4 className="section-subtitle">Asset Information</h4>
                                    <div className="form-grid-2">
                                        <div className="form-group">
                                            <label><ArrowRightLeft size={14} /> Procurement Type</label>
                                            <select
                                                name="procurementType"
                                                value={formData.procurementType}
                                                onChange={handleChange}
                                                className="select-input"
                                            >
                                                <option value="Purchasing">Purchasing</option>
                                                <option value="Vendor">Vendor (Lease)</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label><Package size={14} /> Asset Type</label>
                                            <select
                                                name="assetType"
                                                value={formData.assetType || ''}
                                                onChange={handleTypeChange}
                                                className="select-input"
                                                required
                                            >
                                                <option value="">-- Select --</option>
                                                {assetTypes.map(type => (
                                                    <option key={type.id || type.typeId} value={type.id || type.typeId}>
                                                        {type.typeName || type.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {selectedType && (selectedType.typeName === 'Laptop' || selectedType.name === 'Laptop') && (
                                            <div className="accessories-section" style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '10px' }}>
                                                <h5 style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Package size={14} /> Included Accessories
                                                </h5>
                                                <div className="accessories-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                                    <div className="accessory-item" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.includeCharger}
                                                                onChange={(e) => {
                                                                    const checked = e.target.checked;
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        includeCharger: checked,
                                                                        chargerQuantity: checked ? prev.quantity : 0
                                                                    }));
                                                                }}
                                                            />
                                                            Add Chargers
                                                        </label>
                                                        {formData.includeCharger && (
                                                            <div className="qty-input" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '24px' }}>
                                                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Qty:</span>
                                                                <input
                                                                    type="number"
                                                                    value={formData.chargerQuantity}
                                                                    onChange={(e) => setFormData(prev => ({ ...prev, chargerQuantity: parseInt(e.target.value) || 0 }))}
                                                                    style={{ width: '60px', padding: '4px 8px', fontSize: '12px' }}
                                                                    min="0"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="accessory-item" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.includeMouse}
                                                                onChange={(e) => {
                                                                    const checked = e.target.checked;
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        includeMouse: checked,
                                                                        mouseQuantity: checked ? prev.quantity : 0
                                                                    }));
                                                                }}
                                                            />
                                                            Add Mice
                                                        </label>
                                                        {formData.includeMouse && (
                                                            <div className="qty-input" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '24px' }}>
                                                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Qty:</span>
                                                                <input
                                                                    type="number"
                                                                    value={formData.mouseQuantity}
                                                                    onChange={(e) => setFormData(prev => ({ ...prev, mouseQuantity: parseInt(e.target.value) || 0 }))}
                                                                    style={{ width: '60px', padding: '4px 8px', fontSize: '12px' }}
                                                                    min="0"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {formData.quantity === 1 && selectedType && ['Laptop', 'Desktop', 'Server', 'Workstation', 'IT Hardware'].includes(selectedType.typeName || selectedType.name) && (
                                        <div className="technical-specs-section">
                                            <h4 className="section-subtitle-inner">Hardware Specifications</h4>
                                            <div className="specs-grid-compact">
                                                <div className="form-group">
                                                    <label>Company</label>
                                                    <select name="companyName" value={formData.companyName} onChange={handleChange} className="select-input">
                                                        <option value="">-- Select --</option>
                                                        <option value="Dell">Dell</option>
                                                        <option value="HP">HP</option>
                                                        <option value="Lenovo">Lenovo</option>
                                                        <option value="Apple">Apple</option>
                                                        <option value="Asus">Asus</option>
                                                        <option value="Acer">Acer</option>
                                                        <option value="MSI">MSI</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label>Gen</label>
                                                    <select name="generation" value={formData.generation} onChange={handleChange} className="select-input">
                                                        <option value="">-- Select --</option>
                                                        <option value="i3 10th Gen">i3 10th Gen</option>
                                                        <option value="i3 11th Gen">i3 11th Gen</option>
                                                        <option value="i3 12th Gen">i3 12th Gen</option>
                                                        <option value="i5 10th Gen">i5 10th Gen</option>
                                                        <option value="i5 11th Gen">i5 11th Gen</option>
                                                        <option value="i5 12th Gen">i5 12th Gen</option>
                                                        <option value="i5 13th Gen">i5 13th Gen</option>
                                                        <option value="i7 10th Gen">i7 10th Gen</option>
                                                        <option value="i7 11th Gen">i7 11th Gen</option>
                                                        <option value="i7 12th Gen">i7 12th Gen</option>
                                                        <option value="i7 13th Gen">i7 13th Gen</option>
                                                        <option value="i9 11th Gen">i9 11th Gen</option>
                                                        <option value="i9 12th Gen">i9 12th Gen</option>
                                                        <option value="i9 13th Gen">i9 13th Gen</option>
                                                        <option value="Ryzen 5 5000">Ryzen 5 5000</option>
                                                        <option value="Ryzen 7 5000">Ryzen 7 5000</option>
                                                        <option value="Ryzen 9 5000">Ryzen 9 5000</option>
                                                        <option value="M1">M1</option>
                                                        <option value="M2">M2</option>
                                                        <option value="M3">M3</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label>RAM</label>
                                                    <select name="ram" value={formData.ram} onChange={handleChange} className="select-input">
                                                        <option value="">-- Select --</option>
                                                        <option value="4GB">4GB</option>
                                                        <option value="8GB">8GB</option>
                                                        <option value="16GB">16GB</option>
                                                        <option value="32GB">32GB</option>
                                                        <option value="64GB">64GB</option>
                                                    </select>
                                                </div>
                                                <div className="form-group">
                                                    <label>Disk</label>
                                                    <select name="hardDisk" value={formData.hardDisk} onChange={handleChange} className="select-input">
                                                        <option value="">-- Select --</option>
                                                        <option value="256GB SSD">256GB SSD</option>
                                                        <option value="512GB SSD">512GB SSD</option>
                                                        <option value="1TB SSD">1TB SSD</option>
                                                        <option value="2TB SSD">2TB SSD</option>
                                                        <option value="512GB HDD">512GB HDD</option>
                                                        <option value="1TB HDD">1TB HDD</option>
                                                        <option value="2TB HDD">2TB HDD</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="form-grid-2">
                                        {formData.procurementType === 'Vendor' && (
                                            <div className="form-group">
                                                <label><Building2 size={14} /> Vendor</label>
                                                <select
                                                    name="vendor"
                                                    value={formData.vendor?.vendorId || ''}
                                                    onChange={handleVendorChange}
                                                    className="select-input"
                                                    required
                                                >
                                                    <option value="">-- Select --</option>
                                                    {vendors.map(vendor => (
                                                        <option key={vendor.vendorId} value={vendor.vendorId}>
                                                            {vendor.vendorName}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <div className="form-group">
                                            <label><Package size={14} /> Quantity</label>
                                            <input
                                                type="number"
                                                name="quantity"
                                                value={formData.quantity}
                                                onChange={handleQuantityChange}
                                                min="1"
                                                max="50"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {formData.quantity === 1 && (
                                        <div className="form-grid-2" style={{ marginTop: '10px' }}>
                                            <div className="form-group">
                                                <label><Package size={14} /> Asset Name</label>
                                                <input
                                                    type="text"
                                                    name="assetName"
                                                    value={formData.assetName}
                                                    onChange={handleChange}
                                                    required
                                                    placeholder="MacBook Pro"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label><Tag size={14} /> Tag</label>
                                                <input
                                                    type="text"
                                                    name="assetTag"
                                                    value={formData.assetTag}
                                                    onChange={handleChange}
                                                    required
                                                    placeholder="IT-2024"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {formData.quantity > 1 && (
                                        <div className="bulk-entry-section">
                                            <div className="section-subtitle">
                                                <Package size={14} /> Bulk Asset Details
                                            </div>
                                            <div className="bulk-assets-grid">
                                                {formData.bulkAssets.map((asset, index) => (
                                                    <div key={index} className="bulk-asset-card">
                                                        <div className="bulk-card-header">
                                                            <span className="asset-index">#{index + 1}</span>
                                                        </div>
                                                        <div className="bulk-input-row">
                                                            <div className="bulk-input-group">
                                                                <label>Tag</label>
                                                                <input
                                                                    type="text"
                                                                    value={asset.tag}
                                                                    onChange={(e) => handleBulkAssetChange(index, 'tag', e.target.value)}
                                                                    placeholder="Asset Tag"
                                                                    required
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Dynamic Hardware Specs based on global asset type */}
                                                        {formData.assetType && (() => {
                                                            const selectedAssetType = assetTypes.find(t => (t.id || t.typeId) === formData.assetType);
                                                            const typeName = selectedAssetType?.typeName || selectedAssetType?.name || '';
                                                            return ['Laptop', 'Desktop', 'Server', 'Workstation', 'IT Hardware'].includes(typeName);
                                                        })() && (
                                                                <div className="bulk-specs-section">
                                                                    <div className="bulk-input-row">
                                                                        <div className="bulk-input-group">
                                                                            <label>Company</label>
                                                                            <select
                                                                                value={asset.companyName || ''}
                                                                                onChange={(e) => handleBulkAssetChange(index, 'companyName', e.target.value)}
                                                                                className="select-input"
                                                                            >
                                                                                <option value="">-- Select --</option>
                                                                                <option value="Dell">Dell</option>
                                                                                <option value="HP">HP</option>
                                                                                <option value="Lenovo">Lenovo</option>
                                                                                <option value="Apple">Apple</option>
                                                                                <option value="Asus">Asus</option>
                                                                                <option value="Acer">Acer</option>
                                                                                <option value="MSI">MSI</option>
                                                                            </select>
                                                                        </div>
                                                                        <div className="bulk-input-group">
                                                                            <label>Gen</label>
                                                                            <select
                                                                                value={asset.generation || ''}
                                                                                onChange={(e) => handleBulkAssetChange(index, 'generation', e.target.value)}
                                                                                className="select-input"
                                                                            >
                                                                                <option value="">-- Select --</option>
                                                                                <option value="i3 10th Gen">i3 10th Gen</option>
                                                                                <option value="i3 11th Gen">i3 11th Gen</option>
                                                                                <option value="i3 12th Gen">i3 12th Gen</option>
                                                                                <option value="i5 10th Gen">i5 10th Gen</option>
                                                                                <option value="i5 11th Gen">i5 11th Gen</option>
                                                                                <option value="i5 12th Gen">i5 12th Gen</option>
                                                                                <option value="i5 13th Gen">i5 13th Gen</option>
                                                                                <option value="i7 10th Gen">i7 10th Gen</option>
                                                                                <option value="i7 11th Gen">i7 11th Gen</option>
                                                                                <option value="i7 12th Gen">i7 12th Gen</option>
                                                                                <option value="i7 13th Gen">i7 13th Gen</option>
                                                                                <option value="i9 11th Gen">i9 11th Gen</option>
                                                                                <option value="i9 12th Gen">i9 12th Gen</option>
                                                                                <option value="i9 13th Gen">i9 13th Gen</option>
                                                                                <option value="Ryzen 5 5000">Ryzen 5 5000</option>
                                                                                <option value="Ryzen 7 5000">Ryzen 7 5000</option>
                                                                                <option value="Ryzen 9 5000">Ryzen 9 5000</option>
                                                                                <option value="M1">M1</option>
                                                                                <option value="M2">M2</option>
                                                                                <option value="M3">M3</option>
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                    <div className="bulk-input-row">
                                                                        <div className="bulk-input-group">
                                                                            <label>RAM</label>
                                                                            <select
                                                                                value={asset.ram || ''}
                                                                                onChange={(e) => handleBulkAssetChange(index, 'ram', e.target.value)}
                                                                                className="select-input"
                                                                            >
                                                                                <option value="">-- Select --</option>
                                                                                <option value="4GB">4GB</option>
                                                                                <option value="8GB">8GB</option>
                                                                                <option value="16GB">16GB</option>
                                                                                <option value="32GB">32GB</option>
                                                                                <option value="64GB">64GB</option>
                                                                            </select>
                                                                        </div>
                                                                        <div className="bulk-input-group">
                                                                            <label>Disk</label>
                                                                            <select
                                                                                value={asset.hardDisk || ''}
                                                                                onChange={(e) => handleBulkAssetChange(index, 'hardDisk', e.target.value)}
                                                                                className="select-input"
                                                                            >
                                                                                <option value="">-- Select --</option>
                                                                                <option value="256GB SSD">256GB SSD</option>
                                                                                <option value="512GB SSD">512GB SSD</option>
                                                                                <option value="1TB SSD">1TB SSD</option>
                                                                                <option value="2TB SSD">2TB SSD</option>
                                                                                <option value="512GB HDD">512GB HDD</option>
                                                                                <option value="1TB HDD">1TB HDD</option>
                                                                                <option value="2TB HDD">2TB HDD</option>
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {formData.procurementType === 'Vendor' && (
                                        <div className="form-grid-2">
                                            <div className="form-group">
                                                <label><User size={14} /> Receiver</label>
                                                <input
                                                    type="text"
                                                    name="receiverName"
                                                    value={formData.receiverName}
                                                    onChange={handleChange}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label><ArrowRightLeft size={14} /> Exchange</label>
                                                <select
                                                    name="exchangeType"
                                                    value={formData.exchangeType}
                                                    onChange={handleChange}
                                                    className="select-input"
                                                >
                                                    <option value="Issue">Issue</option>
                                                    <option value="Return">Return</option>
                                                    <option value="Replace">Replace</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="form-section">
                                    <div className="procurement-details-section">
                                        <h4 className="section-subtitle">
                                            {formData.procurementType === 'Purchasing' ? 'Purchasing Details' : 'Delivery Details'}
                                        </h4>
                                        <div className="specs-grid-compact">
                                            {formData.procurementType === 'Purchasing' ? (
                                                <>
                                                    <div className="form-group">
                                                        <label>Date</label>
                                                        <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Invoice #</label>
                                                        <input type="text" name="invoiceNumber" value={formData.invoiceNumber} onChange={handleChange} placeholder="INV-001" />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Cost</label>
                                                        <input type="number" name="purchaseCost" value={formData.purchaseCost} onChange={handleChange} placeholder="50000" />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Warranty</label>
                                                        <input type="text" name="warrantyPeriod" value={formData.warrantyPeriod} onChange={handleChange} placeholder="12m" />
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="form-group">
                                                        <label>Contact</label>
                                                        <input type="text" name="vendorContact" value={formData.vendorContact} onChange={handleChange} placeholder="John Sales" />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Delivery</label>
                                                        <input type="date" name="deliveryDate" value={formData.deliveryDate} onChange={handleChange} />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="attachments-section">
                                        <div className="form-grid-2-equal">
                                            <div className="form-group">
                                                <label><FileText size={14} /> Invoice</label>
                                                <div className="invoice-upload-box-compact">
                                                    {invoiceFile ? (
                                                        <div className="invoice-item-compact">
                                                            <span className="file-name-compact">{invoiceFile.name}</span>
                                                            <button type="button" className="remove-invoice-btn" onClick={removeInvoice}><X size={12} /></button>
                                                        </div>
                                                    ) : (
                                                        <div className="upload-placeholder-compact" onClick={() => invoiceInputRef.current.click()}>
                                                            <UploadCloud size={16} />
                                                            <span>Click to upload</span>
                                                        </div>
                                                    )}
                                                    <input type="file" ref={invoiceInputRef} onChange={handleInvoiceChange} style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" />
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label><ImageIcon size={14} /> Photos</label>
                                                <div className="photo-upload-grid-compact">
                                                    {formData.photos.map((photo, index) => (
                                                        <div key={index} className="photo-preview-item-compact">
                                                            <img src={buildFileUrl(photo)} alt="" />
                                                            <button type="button" className="photo-remove" onClick={() => removePhoto(index)}><X size={10} /></button>
                                                        </div>
                                                    ))}
                                                    {formData.photos.length < 4 && (
                                                        <button type="button" className="photo-upload-btn-compact" onClick={() => fileInputRef.current.click()}>
                                                            <Camera size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                                <input type="file" ref={fileInputRef} onChange={handlePhotoChange} multiple accept="image/*" style={{ display: 'none' }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginTop: '0.5rem' }}>
                                        <label><MessageSquare size={14} /> Remarks</label>
                                        <textarea name="remarks" value={formData.remarks} onChange={handleChange} placeholder="Notes..." rows="2" />
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
                                <button type="submit" className="submit-btn primary-glow" disabled={loading}>
                                    {loading ? 'Adding...' : 'Add Asset'}
                                </button>
                            </div>
                        </form>
                    </>
                )}

                {step === 'prompt' && (
                    <div className="prompt-content animate-fade-in" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                        <div className="success-icon-large" style={{
                            width: '80px',
                            height: '80px',
                            background: '#ecfdf5',
                            color: '#10b981',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem',
                            fontSize: '40px'
                        }}>
                            <CheckCircle size={40} />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.5rem' }}>Asset Added Successfully!</h2>
                        <p style={{ color: '#64748b', marginBottom: '2.5rem', fontSize: '1rem' }}>
                            The asset has been registered to the inventory. Would you like to assign it to an employee now?
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button
                                className="secondary-btn"
                                onClick={() => {
                                    onAdd({ assets: addedAssets });
                                    onClose();
                                }}
                                style={{ padding: '0.75rem 2.5rem' }}
                            >
                                Finish & Close
                            </button>
                            <button
                                className="submit-btn"
                                onClick={() => setStep('assign')}
                                style={{ padding: '0.75rem 2.5rem' }}
                            >
                                Assign to Employee <ArrowRightLeft size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {step === 'assign' && (
                    <div className="assign-view animate-fade-in">
                        <div className="modal-header">
                            <div className="header-info">
                                <div className="header-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                                    <User size={20} />
                                </div>
                                <div>
                                    <h3>Assign Asset</h3>
                                    <p>Select an employee to link with the newly added asset.</p>
                                </div>
                            </div>
                            <button className="close-btn" onClick={() => setStep('prompt')}><X size={20} /></button>
                        </div>

                        <div className="modal-form" style={{ background: 'white' }}>
                            <div className="search-box" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Search Employee</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        placeholder="Search by Employee ID or Name..."
                                        value={empSearch}
                                        onChange={(e) => setEmpSearch(e.target.value)}
                                        className="form-input"
                                        style={{ paddingLeft: '2.5rem' }}
                                    />
                                    <User size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                </div>
                            </div>

                            <div className="employee-list" style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                                {employees
                                    .filter(emp => (emp.name || '').toLowerCase().includes(empSearch.toLowerCase()))
                                    .map(emp => (
                                        <div
                                            key={emp.id}
                                            className={`emp-item ${selectedEmployee?.id === emp.id ? 'selected' : ''}`}
                                            onClick={() => setSelectedEmployee(emp)}
                                            style={{
                                                padding: '1rem',
                                                borderBottom: '1px solid #f1f5f9',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1rem',
                                                backgroundColor: selectedEmployee?.id === emp.id ? '#eff6ff' : 'transparent',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ width: '40px', height: '40px', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifycontent: 'center', color: '#64748b' }}>
                                                <User size={20} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '700', color: '#1e293b' }}>{emp.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{emp.deptName || '-'} • {emp.roleName || '-'}</div>
                                            </div>
                                            {selectedEmployee?.id === emp.id && <CheckCircle size={20} color="#2563eb" />}
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="secondary-btn" onClick={() => setStep('prompt')}>Back</button>
                            <button
                                className="submit-btn"
                                disabled={!selectedEmployee}
                                onClick={async () => {
                                    setAssignLoading(true);
                                    try {
                                        const updatedAssets = await handleBulkAssign();
                                        onAdd({ assets: updatedAssets });
                                        onClose();
                                    } catch (err) {
                                        alert('Assignment failed.');
                                    } finally {
                                        setAssignLoading(false);
                                    }
                                }}
                            >
                                {assignLoading ? 'Assigning...' : 'Confirm Assignment'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .procurement-toggle-container {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    background: #f1f5f9;
                    padding: 0.5rem;
                    border-radius: 12px;
                }

                .toggle-btn {
                    flex: 1;
                    padding: 0.75rem;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 0.875rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: transparent;
                    color: #64748b;
                }

                .toggle-btn.active {
                    background: white;
                    color: #2563eb;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }

                .procurement-details-section {
                    background: #f8fafc;
                    padding: 1rem;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    margin-bottom: 1rem;
                }

                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.4);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    padding: 1rem;
                }

                .modal-container {
                    background: white;
                    width: 100%;
                    max-width: 1000px;
                    border-radius: 20px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.2);
                    display: flex;
                    flex-direction: column;
                    max-height: 90vh;
                    overflow-x: hidden;
                }

                .modal-container.scrollable {
                    overflow-y: auto;
                }

                .animate-pop {
                    animation: pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                @keyframes pop {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }

                .modal-header {
                    padding: 1rem 1.75rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #f1f5f9;
                    position: sticky;
                    top: 0;
                    background: white;
                    z-index: 10;
                }

                .header-info {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .header-icon {
                    width: 36px;
                    height: 36px;
                    background: #eff6ff;
                    color: #2563eb;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .header-info h3 {
                    font-size: 1.125rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin-bottom: 0px;
                }

                .header-info p {
                    font-size: 0.875rem;
                    color: #64748b;
                }
            `}</style>
            <style>{`
                :root {
                    --primary: #2563eb;
                    --primary-soft: #eff6ff;
                    --primary-glow: rgba(37, 99, 235, 0.15);
                    --slate-50: #f8fafc;
                    --slate-100: #f1f5f9;
                    --slate-200: #e2e8f0;
                    --slate-300: #cbd5e1;
                    --slate-400: #94a3b8;
                    --slate-600: #475569;
                    --slate-700: #334155;
                    --slate-800: #1e293b;
                    --success: #10b981;
                    --success-soft: #ecfdf5;
                }

                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.3);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    padding: 1rem;
                    animation: overlay-fade 0.3s ease-out;
                }

                @keyframes overlay-fade {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .modal-container {
                    background: white;
                    width: 100%;
                    max-width: 950px;
                    border-radius: 20px;
                    box-shadow: 0 25px 70px -12px rgba(15, 23, 42, 0.15);
                    display: flex;
                    flex-direction: column;
                    max-height: 90vh;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.8);
                }

                .modal-header {
                    padding: 1rem 1.75rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(10px);
                    border-bottom: 1px solid var(--slate-100);
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }

                .header-info {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .header-icon {
                    width: 40px;
                    height: 40px;
                    background: linear-gradient(135deg, var(--primary-soft) 0%, #dbeafe 100%);
                    color: var(--primary);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: inset 0 -2px 4px rgba(37, 99, 235, 0.1);
                }

                .header-info h3 {
                    font-size: 1.125rem;
                    font-weight: 800;
                    color: var(--slate-800);
                    letter-spacing: -0.01em;
                    margin: 0;
                }

                .header-info p {
                    font-size: 0.8125rem;
                    color: var(--slate-400);
                    margin: 0;
                }

                .modal-form {
                    padding: 1.25rem 1.75rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                    overflow-y: auto;
                    background: #fafbfc;
                }

                .form-sections {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.25rem;
                }

                .form-section {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    background: white;
                    padding: 1.25rem;
                    border-radius: 16px;
                    border: 1px solid var(--slate-100);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
                }

                .section-subtitle {
                    font-size: 0.875rem;
                    font-weight: 800;
                    color: var(--slate-800);
                    margin-bottom: 0px;
                    display: flex;
                    align-items: center;
                    gap: 0.625rem;
                    padding-bottom: 0.625rem;
                    border-bottom: 1px solid var(--slate-100);
                }

                .section-subtitle::before {
                    content: '';
                    width: 3px;
                    height: 16px;
                    background: var(--primary);
                    border-radius: 2px;
                }

                .form-grid-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.375rem;
                }

                .form-group label {
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: var(--slate-400);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                }

                .form-group input, 
                .form-group select, 
                .form-group textarea {
                    padding: 0.625rem 0.875rem;
                    border: 1.5px solid var(--slate-200);
                    border-radius: 10px;
                    font-size: 0.875rem;
                    color: var(--slate-800);
                    background: var(--slate-50);
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    width: 100%;
                }

                .form-group input:hover,
                .form-group select:hover {
                    border-color: var(--slate-300);
                    background: white;
                }

                .form-group input:focus, 
                .form-group select:focus {
                    outline: none;
                    border-color: var(--primary);
                    background: white;
                    box-shadow: 0 0 0 4px var(--primary-glow);
                }

                .technical-specs-section {
                    background: #f8fafc;
                    padding: 1rem;
                    border-radius: 12px;
                    border: 1px solid var(--slate-100);
                    margin-top: 0.25rem;
                }

                .section-subtitle-inner {
                    font-size: 0.7rem;
                    font-weight: 800;
                    color: var(--slate-600);
                    margin-bottom: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.075em;
                }

                .specs-grid-compact {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                }

                .procurement-details-section {
                    background: linear-gradient(135deg, #f0f7ff 0%, #e0efff 100%);
                    padding: 1rem;
                    border-radius: 12px;
                    border: 1px solid #d0e5ff;
                }

                .attachments-section {
                    margin-top: 0.25rem;
                }

                .form-grid-2-equal {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.25rem;
                }

                /* Compact Invoice Upload */
                .invoice-upload-box-compact {
                    margin-top: 0.25rem;
                }

                .invoice-item-compact {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: #f0fdf4;
                    padding: 0.5rem 0.875rem;
                    border-radius: 10px;
                    border: 1px solid #bbf7d0;
                    animation: slide-up 0.3s ease-out;
                }

                @keyframes slide-up {
                    from {transform: translateY(5px); opacity: 0; }
                    to {transform: translateY(0); opacity: 1; }
                }

                .file-name-compact {
                    font-size: 0.8125rem;
                    font-weight: 700;
                    color: #15803d;
                    max-width: 140px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .upload-placeholder-compact {
                    border: 2px dashed var(--slate-200);
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.625rem;
                    border-radius: 10px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--slate-400);
                    cursor: pointer;
                    background: var(--slate-50);
                    transition: all 0.2s;
                }

                .upload-placeholder-compact:hover {
                    border-color: var(--primary);
                    color: var(--primary);
                    background: var(--primary-soft);
                    transform: translateY(-1px);
                }

                /* Photo Grid Compact */
                .photo-upload-grid-compact {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 0.5rem;
                    margin-top: 0.25rem;
                }

                .photo-preview-item-compact {
                    aspect-ratio: 1;
                    position: relative;
                    border-radius: 6px;
                    overflow: hidden;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .photo-preview-item-compact img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .photo-remove {
                    position: absolute;
                    top: 2px;
                    right: 2px;
                    background: rgba(15, 23, 42, 0.7);
                    backdrop-filter: blur(4px);
                    color: white;
                    border: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .photo-remove:hover {
                    background: #f43f5e;
                    transform: scale(1.1);
                }

                .photo-upload-btn-compact {
                    aspect-ratio: 1;
                    border: 2px dashed var(--slate-200);
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--slate-400);
                    cursor: pointer;
                    background: var(--slate-50);
                    transition: all 0.2s;
                }

                .photo-upload-btn-compact:hover {
                    border-color: var(--primary);
                    color: var(--primary);
                    background: var(--primary-soft);
                }

                .modal-footer {
                    padding: 1.25rem 1.75rem;
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                    background: white;
                    border-top: 1px solid var(--slate-100);
                }

                .secondary-btn {
                    padding: 0.625rem 1.75rem;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--slate-600);
                    background: white;
                    border: 1.5px solid var(--slate-200);
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s ease-out;
                }

                .secondary-btn:hover {
                    background: var(--slate-50);
                    color: var(--slate-800);
                    border-color: var(--slate-300);
                    transform: translateY(-1px);
                }

                .submit-btn {
                    padding: 0.625rem 2rem;
                    font-size: 0.875rem;
                    font-weight: 800;
                    color: white;
                    background: linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%);
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    box-shadow: 0 10px 20px -5px var(--primary-glow);
                    display: flex;
                    align-items: center;
                    gap: 0.625rem;
                }

                .submit-btn:hover {
                    transform: translateY(-3px) scale(1.02);
                    box-shadow: 0 15px 30px -5px var(--primary-glow);
                    filter: brightness(1.05);
                }

                .submit-btn:active {
                    transform: translateY(-1px) scale(0.98);
                }

                .close-btn {
                    background: var(--slate-50);
                    border: none;
                    width: 32px;
                    height: 32px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--slate-400);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .close-btn:hover {
                    background: #fee2e2;
                    color: #ef4444;
                    transform: rotate(90deg);
                }

                /* Scrollbar Refinement */
                .modal-form::-webkit-scrollbar {
                    width: 5px;
                }

                .modal-form::-webkit-scrollbar-track {
                    background: transparent;
                }

                .modal-form::-webkit-scrollbar-thumb {
                    background: var(--slate-200);
                    border-radius: 10px;
                }

                .modal-form::-webkit-scrollbar-thumb:hover {
                    background: var(--slate-300);
                }

                @media (max-width: 900px) {
                    .form-sections { grid-template-columns: 1fr; }
                    .modal-container { max-width: 95vw; }
                    .modal-form { padding: 1.25rem; }
                }
                /* Bulk Asset Styling */
                .bulk-entry-section {
                    margin-top: 1rem;
                    background: #f8fafc;
                    padding: 1rem;
                    border-radius: 12px;
                    border: 1px solid var(--slate-100);
                }

                .bulk-assets-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1rem;
                    margin-top: 0.75rem;
                }

                .bulk-asset-card {
                    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                    border: 2px solid var(--slate-200);
                    border-radius: 12px;
                    padding: 1.25rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.04);
                    position: relative;
                    overflow: hidden;
                }

                .bulk-asset-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: linear-gradient(90deg, var(--primary), var(--accent));
                    opacity: 0;
                    transition: opacity 0.3s;
                }

                .bulk-asset-card:hover {
                    border-color: var(--primary);
                    box-shadow: 0 8px 16px -4px rgba(59, 130, 246, 0.15);
                    transform: translateY(-2px);
                }

                .bulk-asset-card:hover::before {
                    opacity: 1;
                }

                .bulk-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                    padding-bottom: 0.75rem;
                    border-bottom: 1px solid var(--slate-100);
                }

                .asset-index {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: black;
                    background: linear-gradient(135deg, var(--slate-500), var(--slate-600));
                    padding: 4px 10px;
                    border-radius: 6px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    transition: all 0.3s;
                }

                .bulk-asset-card:hover .asset-index {
                    background: linear-gradient(135deg, var(--primary), var(--accent));
                    transform: scale(1.05);
                }

                .bulk-input-row {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 0.75rem;
                }

                .bulk-input-row:last-child {
                    margin-bottom: 0;
                }

                .bulk-input-group {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 0.375rem;
                }

                .bulk-input-group label {
                    font-size: 0.6875rem;
                    font-weight: 700;
                    color: var(--slate-600);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }

                .bulk-input-group input,
                .bulk-input-group select {
                    width: 100%;
                    padding: 0.625rem 0.75rem;
                    border: 1.5px solid var(--slate-200);
                    border-radius: 8px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: var(--slate-800);
                    transition: all 0.2s ease;
                    background: white;
                }

                .bulk-input-group input:focus,
                .bulk-input-group select:focus {
                    background: white;
                    border-color: var(--primary);
                    outline: none;
                    box-shadow: 0 0 0 3px var(--primary-glow);
                }
                
                .bulk-input-group input::placeholder {
                    color: var(--slate-400);
                    font-weight: 400;
                }

                /* Hardware Specs Section Styling */
                .bulk-specs-section {
                    margin-top: 1rem;
                    padding-top: 1rem;
                    border-top: 2px dashed var(--slate-200);
                    background: linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(99, 102, 241, 0.03) 100%);
                    padding: 1rem;
                    border-radius: 8px;
                    animation: fadeIn 0.4s ease-in-out;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .bulk-specs-section .bulk-input-row {
                    margin-bottom: 0.75rem;
                }

                .bulk-specs-section .bulk-input-group label {
                    color: var(--primary);
                }

                @media (max-width: 768px) {
                    .bulk-assets-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .bulk-input-row {
                        flex-direction: column;
                        gap: 0.75rem;
                    }
                    
                    .bulk-asset-card {
                        padding: 1rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default AddAssetModal;
