import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Filter,
    Package,
    Tag,
    ArrowRightLeft,
    MessageSquare,
    Image as ImageIcon,
    Edit3,
    Trash2,
    Eye,
    X,
    UserPlus
} from 'lucide-react';
import AddAssetModal from './AddAssetModal';
import EditAssetModal from './EditAssetModal';
import ViewAssetModal from './ViewAssetModal';
import AssignAssetModal from './AssignAssetModal';
import apiService from '../../../services/api';

const Assets = () => {
    const [assets, setAssets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [newAsset, setNewAsset] = useState(null);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [activeFilters, setActiveFilters] = useState({
        exchangeType: 'All',
        assignmentStatus: 'All'
    });

    const normalizeAsset = (raw) => {
        if (!raw || typeof raw !== 'object') return null;
        return {
            ...raw,
            id: (raw?.id || raw?.assetId) ?? null,
            name: (raw?.assetName || raw?.name) ?? 'Unnamed Asset',
            tag: (raw?.assetTag || raw?.tag) ?? '-',
            assetCode: (raw?.assetCode || raw?.id) ?? '-',
            exchangeType: raw?.exchangeType ?? 'Issue',
            procurementType: raw?.procurementType ?? 'Purchasing',
            receiverName: raw?.receiverName ?? '',
            photos: Array.isArray(raw?.photos) ? raw.photos : (Array.isArray(raw?.filePaths) ? raw.filePaths : []),
            vendor: raw?.vendor || (raw?.vendorId ? { vendorId: raw.vendorId, vendorName: 'Vendor ' + raw.vendorId } : null)
        };
    };

    const fetchAssets = async () => {
        setIsLoading(true);
        try {
            const res = await apiService.getAssets();
            let data = [];
            if (res && res.data) data = res.data;
            else if (Array.isArray(res)) data = res;
            else if (res && res.content) data = res.content;

            setAssets(data.map(normalizeAsset));
        } catch (e) {
            console.error('Failed to fetch assets:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
    }, []);

    const exchangeTypes = ['All', ...new Set(assets.map(a => a.exchangeType))];

    const handleAddAsset = async (assetData) => {
        // Handle new workflow: { assets: [...] }
        if (assetData.assets && Array.isArray(assetData.assets)) {
            fetchAssets();
            setIsAddModalOpen(false);
            return;
        }

        try {
            await apiService.createAsset(assetData);
            fetchAssets();
            setIsAddModalOpen(false);
        } catch (error) {
            console.error('Failed to add asset:', error);
            alert('Failed to add asset: ' + error.message);
        }
    };

    const handleUpdateAsset = async (updatedAsset) => {
        try {
            await apiService.updateAsset(updatedAsset.id, updatedAsset);
            fetchAssets();
            setIsEditModalOpen(false);
            setSelectedAsset(null);
        } catch (error) {
            console.error('Failed to update asset:', error);
            alert('Failed to update asset: ' + error.message);
        }
    };

    const handleDeleteAsset = async (id) => {
        if (window.confirm('Are you sure you want to delete this asset from the database?')) {
            try {
                await apiService.deleteAsset(id);
                setAssets(prev => prev.filter(a => a.id !== id));
            } catch (error) {
                console.error('Failed to delete asset:', error);
                alert('Failed to delete asset: ' + error.message);
            }
        }
    };

    const handleAssignEmployee = async (employee) => {
        if (newAsset) {
            try {
                const updated = {
                    ...newAsset,
                    receiverName: employee.name,
                    exchangeType: 'Issue',
                    remarks: `${newAsset.remarks ? newAsset.remarks + '. ' : ''}Assigned to ${employee.name} (${employee.dept})`
                };
                await apiService.updateAsset(newAsset.id, updated);
                fetchAssets();
                setIsAssignModalOpen(false);
            } catch (error) {
                console.error('Failed to assign asset:', error);
                alert('Failed to assign asset: ' + error.message);
            }
        }
    };

    const openEditModal = (asset) => {
        setSelectedAsset(asset);
        setIsEditModalOpen(true);
    };

    const openAssignModal = (asset) => {
        setNewAsset(asset);
        setIsAssignModalOpen(true);
    };

    const openViewModal = (asset) => {
        setSelectedAsset(asset);
        setIsViewModalOpen(true);
    };

    const filteredAssets = (assets || []).filter(asset => {
        const term = (searchTerm || '').toLowerCase();
        const matchesSearch =
            (asset?.name || '').toLowerCase().includes(term) ||
            (asset?.tag || '').toLowerCase().includes(term) ||
            String(asset?.id || '').toLowerCase().includes(term);

        const matchesExchange = activeFilters.exchangeType === 'All' || asset?.exchangeType === activeFilters.exchangeType;
        const matchesAssignment = activeFilters.assignmentStatus === 'All' ||
            (activeFilters.assignmentStatus === 'Assigned' ? asset?.receiverName : !asset?.receiverName);

        return matchesSearch && matchesExchange && matchesAssignment;
    });

    const clearFilter = (key) => {
        setActiveFilters(prev => ({ ...prev, [key]: 'All' }));
    };

    const hasActiveFilters = Object.values(activeFilters).some(v => v !== 'All');

    return (
        <div className="assets-page animate-fade-in">
            <header className="page-header">
                <div className="header-title">
                    <h1>Asset Management</h1>
                    <p>Track hardware and software assignments across the organization.</p>
                </div>
                <div className="header-actions">
                    <button className="primary-btn" onClick={() => setIsAddModalOpen(true)}>
                        <Plus size={18} />
                        <span>Add Asset</span>
                    </button>
                </div>
            </header>

            <AddAssetModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddAsset}
            />


            <AssignAssetModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                onAssign={handleAssignEmployee}
                assetName={newAsset?.name || 'Asset'}
            />

            {selectedAsset && (
                <>
                    <EditAssetModal
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        onUpdate={handleUpdateAsset}
                        asset={selectedAsset}
                    />
                    <ViewAssetModal
                        isOpen={isViewModalOpen}
                        onClose={() => setIsViewModalOpen(false)}
                        asset={selectedAsset}
                    />
                </>
            )}

            <div className="main-table-container">
                <div className="table-controls">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, tag, or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="filter-group">
                        <div className="filter-popover-wrapper">
                            <button
                                className={`control-btn ${hasActiveFilters ? 'active' : ''}`}
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                <Filter size={16} />
                                <span>Filters</span>
                                {hasActiveFilters && <span className="filter-indicator" />}
                            </button>

                            {showFilters && (
                                <div className="filter-popover card">
                                    <div className="popover-header">
                                        <h3>Filter Assets</h3>
                                        <button className="icon-btn-sm" onClick={() => setShowFilters(false)}>
                                            <X size={14} />
                                        </button>
                                    </div>

                                    <div className="popover-body">
                                        <div className="filter-item">
                                            <label>Exchange Type</label>
                                            <select
                                                value={activeFilters.exchangeType}
                                                onChange={(e) => setActiveFilters(prev => ({ ...prev, exchangeType: e.target.value }))}
                                            >
                                                {exchangeTypes.map(type => <option key={type} value={type}>{type}</option>)}
                                            </select>
                                        </div>
                                        <div className="filter-item">
                                            <label>Assignment Status</label>
                                            <select
                                                value={activeFilters.assignmentStatus}
                                                onChange={(e) => setActiveFilters(prev => ({ ...prev, assignmentStatus: e.target.value }))}
                                            >
                                                <option value="All">All</option>
                                                <option value="Assigned">Assigned</option>
                                                <option value="Unassigned">Unassigned</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="popover-footer">
                                        <button
                                            className="text-btn"
                                            onClick={() => setActiveFilters({ exchangeType: 'All', assignmentStatus: 'All' })}
                                        >
                                            Reset All
                                        </button>
                                        <button className="apply-btn" onClick={() => setShowFilters(false)}>
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {hasActiveFilters && (
                    <div className="active-filters">
                        {Object.entries(activeFilters).map(([key, value]) => (
                            value !== 'All' && (
                                <div key={key} className="filter-badge">
                                    <span className="badge-label">{key}:</span>
                                    <span className="badge-value">{value}</span>
                                    <button onClick={() => clearFilter(key)}>
                                        <X size={12} />
                                    </button>
                                </div>
                            )
                        ))}
                        <button
                            className="clear-all-link"
                            onClick={() => setActiveFilters({ exchangeType: 'All', assignmentStatus: 'All' })}
                        >
                            Clear all
                        </button>
                    </div>
                )}

                <div className="table-overflow">
                    {isLoading ? (
                        <div className="loading-state">
                            <div className="loader"></div>
                            <p>Loading assets from database...</p>
                        </div>
                    ) : (
                        <table className="premium-table">
                            <thead>
                                <tr>
                                    <th>Asset Code</th>
                                    <th>Procurement</th>
                                    <th>Asset Name</th>
                                    <th>Asset Tag</th>
                                    <th>Receiver Name</th>
                                    <th>Vendor</th>
                                    <th>Exchange Type</th>
                                    <th>Media</th>
                                    <th className="text-center">Action</th>
                                </tr>
                            </thead>
                              <tbody>
                                {filteredAssets.length > 0 ? (
                                    filteredAssets.map((asset) => (
                                        <tr key={asset?.id || Math.random()} className="table-row-hover">
                                            <td>
                                                <div className="tag-cell font-mono">
                                                    <span className="asset-id">{asset?.assetCode || '-'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`procurement-badge ${(asset?.procurementType || '').toLowerCase() === 'vendor' ? 'vendor' : 'purchased'}`}>
                                                    {(asset?.procurementType || '').toLowerCase() === 'vendor' ? 'From Vendor' : 'Purchased'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="asset-profile-cell">
                                                    <div className="asset-icon">
                                                        <Package size={20} />
                                                    </div>
                                                    <div className="asset-main">
                                                        <span className="asset-name">{asset?.name || 'Unnamed'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="tag-cell">
                                                    <Tag size={14} />
                                                    <span>{asset?.tag || '-'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="receiver-cell">
                                                    <span className="receiver-name">{asset?.receiverName || '-'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="vendor-cell">
                                                    {asset?.vendor ? (
                                                        <span className="vendor-name">{asset.vendor.vendorName || 'N/A'}</span>
                                                    ) : (
                                                        <span className="text-muted">No vendor</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className={`status-badge ${(asset?.exchangeType || 'unknown').toLowerCase()}`}>
                                                    <span className="dot"></span>
                                                    <span>{asset?.exchangeType || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="media-cell">
                                                    <ImageIcon size={14} />
                                                    <span>{asset?.photos?.length || 0}</span>
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <div className="action-buttons">
                                                    <button className="icon-btn" onClick={() => openViewModal(asset)} title="View Detail">
                                                        <Eye size={16} />
                                                    </button>
                                                    <button className="icon-btn highlight" onClick={() => openAssignModal(asset)} title="Assign Asset">
                                                        <UserPlus size={16} />
                                                    </button>
                                                    <button className="icon-btn" onClick={() => openEditModal(asset)} title="Edit Asset">
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button className="icon-btn danger" onClick={() => handleDeleteAsset(asset.id)} title="Delete Asset">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="text-center py-8 text-muted">
                                            No assets found matching your criteria.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <style>{`
                .assets-page {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    padding-bottom: 2rem;
                }

                .animate-fade-in {
                    animation: fadeIn 0.5s ease-out;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .header-title h1 {
                    font-size: 2rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin-bottom: 0.25rem;
                }

                .header-title p {
                    color: #64748b;
                    font-size: 0.9375rem;
                }

                .primary-btn {
                    background: #2563eb;
                    color: white;
                    padding: 0.75rem 1.5rem;
                    border-radius: 10px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    border: none;
                    transition: all 0.2s;
                }

                .primary-btn:hover {
                    background: #1d4ed8;
                    transform: translateY(-1px);
                }

                .main-table-container {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    overflow: hidden;
                }

                .table-controls {
                    padding: 1.25rem 1.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #f1f5f9;
                }

                .search-box {
                    position: relative;
                    flex: 1;
                    max-width: 400px;
                }

                .search-box svg {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94a3b8;
                }

                .search-box input {
                    width: 100%;
                    padding: 0.625rem 1rem 0.625rem 2.5rem;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    font-size: 0.875rem;
                }

                .filter-group {
                    display: flex;
                    gap: 0.75rem;
                }

                .control-btn {
                    background: white;
                    border: 1px solid #e2e8f0;
                    padding: 0.625rem 1rem;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #475569;
                    cursor: pointer;
                    position: relative;
                    transition: all 0.2s;
                    white-space: nowrap;
                }

                .control-btn:hover {
                    border-color: #2563eb;
                    color: #2563eb;
                    background: #f8faff;
                }

                .control-btn.active {
                    border-color: #2563eb;
                    color: #2563eb;
                    background: #eff6ff;
                }

                .filter-indicator {
                    width: 6px;
                    height: 6px;
                    background: #2563eb;
                    border-radius: 50%;
                    position: absolute;
                    top: 8px;
                    right: 8px;
                }

                .filter-popover-wrapper {
                    position: relative;
                }

                .filter-popover {
                    position: absolute;
                    top: calc(100% + 12px);
                    right: 0;
                    width: 280px;
                    z-index: 100;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                    border: 1px solid #e2e8f0;
                    background: white;
                    border-radius: 12px;
                    padding: 0 !important;
                    animation: popIn 0.2s ease-out;
                    overflow: hidden;
                }

                @keyframes popIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .popover-header {
                    padding: 1rem 1.25rem;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .popover-header h3 {
                    font-size: 0.875rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0;
                }

                .popover-body {
                    padding: 1.25rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .filter-item {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .filter-item label {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .filter-item select {
                    padding: 0.5rem;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 0.875rem;
                    background: #f8fafc;
                    outline: none;
                }

                .popover-footer {
                    padding: 1rem 1.25rem;
                    background: #f8fafc;
                    border-top: 1px solid #f1f5f9;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .text-btn {
                    background: none;
                    border: none;
                    color: #64748b;
                    font-size: 0.875rem;
                    font-weight: 600;
                    cursor: pointer;
                }

                .text-btn:hover {
                    color: #2563eb;
                }

                .apply-btn {
                    background: #2563eb;
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    cursor: pointer;
                }

                .active-filters {
                    padding: 0.75rem 1.5rem;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    align-items: center;
                    border-bottom: 1px solid #f1f5f9;
                    background: white;
                }

                .filter-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                    background: #eff6ff;
                    color: #2563eb;
                    padding: 0.25rem 0.625rem;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    border: 1px solid #dbeafe;
                }

                .badge-label {
                    color: #60a5fa;
                    text-transform: capitalize;
                }

                .filter-badge button {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: none;
                    border: none;
                    color: #2563eb;
                    cursor: pointer;
                    padding: 0;
                    border-radius: 50%;
                }

                .clear-all-link {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #64748b;
                    background: none;
                    border: none;
                    cursor: pointer;
                    margin-left: 0.5rem;
                }

                .clear-all-link:hover {
                    color: #2563eb;
                    text-decoration: underline;
                }

                .icon-btn-sm {
                    width: 24px;
                    height: 24px;
                    border-radius: 4px;
                    border: none;
                    background: transparent;
                    color: #94a3b8;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .premium-table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 1100px;
                }

                .table-overflow {
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    padding-bottom: 1rem;
                }

                th {
                    text-align: left;
                    padding: 1rem 1.5rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                }

                td {
                    padding: 1rem 1.5rem;
                    vertical-align: middle;
                    border-bottom: 1px solid #f1f5f9;
                }

                .table-row-hover:hover {
                    background: #fcfdfe;
                }

                .asset-profile-cell {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .asset-icon {
                    width: 40px;
                    height: 40px;
                    background: #f8fafc;
                    color: #64748b;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid #e2e8f0;
                }

                .asset-main {
                    display: flex;
                    flex-direction: column;
                }

                .asset-name {
                    font-weight: 600;
                    color: #1e293b;
                    font-size: 0.9375rem;
                }

                .asset-id {
                    font-size: 0.75rem;
                }

                .receiver-cell {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .receiver-name {
                    font-weight: 500;
                    color: #1e293b;
                    font-size: 0.875rem;
                }

                .vendor-cell {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .vendor-name {
                    font-weight: 500;
                    color: #1e293b;
                    font-size: 0.875rem;
                }

                .tag-cell, .media-cell {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #64748b;
                    font-size: 0.875rem;
                }

                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: capitalize;
                }

                .status-badge .dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                }

                .status-badge.issue { background: #eff6ff; color: #1d4ed8; }
                .status-badge.issue .dot { background: #2563eb; }

                .status-badge.return { background: #fff1f2; color: #be123c; }
                .status-badge.return .dot { background: #ef4444; }

                .status-badge.replace { background: #fefce8; color: #a16207; }
                .status-badge.replace .dot { background: #eab308; }

                .procurement-badge {
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    display: inline-block;
                }

                .procurement-badge.purchased {
                    background: #ecfdf5;
                    color: #059669;
                    border: 1px solid #d1fae5;
                }

                .procurement-badge.vendor {
                    background: #fef2f2;
                    color: #dc2626;
                    border: 1px solid #fee2e2;
                }

                .action-buttons {
                    display: flex;
                    gap: 0.5rem;
                    justify-content: center;
                }

                .icon-btn {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    background: white;
                    border: 1px solid #e2e8f0;
                    color: #64748b;
                    transition: all 0.2s;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }

                .icon-btn:hover {
                    background: #f8fafc;
                    border-color: #2563eb;
                    color: #2563eb;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                }

                .icon-btn.danger:hover {
                    background: #fef2f2;
                    border-color: #ef4444;
                    color: #ef4444;
                }

                .icon-btn.highlight:hover {
                    background: #f0fdf4;
                    border-color: #22c55e;
                    color: #22c55e;
                }

                .loading-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem;
                    gap: 1rem;
                    color: #64748b;
                }

                .loader {
                    width: 40px;
                    height: 40px;
                    border: 3px solid #f1f5f9;
                    border-top: 3px solid #2563eb;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default Assets;
