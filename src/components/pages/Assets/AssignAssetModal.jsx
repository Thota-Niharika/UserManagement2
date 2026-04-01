import React, { useState } from 'react';
import { X, User, Search, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import apiService from '../../../services/api';

const AssignAssetModal = ({ isOpen, onClose, onAssign, assetName }) => {
    const [step, setStep] = useState('prompt'); // 'prompt' | 'search' | 'confirm'
    const [empId, setEmpId] = useState('');
    const [employee, setEmployee] = useState(null);
    const [error, setError] = useState('');
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch employees when modal opens or step changes to search
    React.useEffect(() => {
        if (isOpen && (step === 'search' || employees.length === 0)) {
            const fetchEmployees = async () => {
                setLoading(true);
                try {
                    // API returns pre-normalized flat array
                    const list = await apiService.getEmployees();
                    setEmployees(list);
                } catch (err) {
                    console.error('Failed to fetch employees:', err);
                } finally {
                    setLoading(false);
                }
            };
            fetchEmployees();
        }
    }, [isOpen, step]);

    if (!isOpen) return null;

    const handleSearch = (e) => {
        e.preventDefault();
        setError('');

        if (!empId.trim()) {
            setError('Please enter an Employee ID');
            return;
        }

        const found = employees.find(emp =>
            String(emp.id).toUpperCase() === empId.trim().toUpperCase()
        );

        if (found) {
            setEmployee({
                id: found.id,
                name: found.name,
                designation: found.roleName,
                dept: found.deptName
            });
        } else {
            setError('Employee not found with this ID');
            setEmployee(null);
        }
    };

    const handleAssign = () => {
        if (employee) {
            onAssign(employee);
            handleClose();
        }
    };

    const handleClose = () => {
        setStep('prompt');
        setEmpId('');
        setEmployee(null);
        setError('');
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container animate-pop">
                <button className="close-btn-abs" onClick={handleClose}><X size={20} /></button>

                {step === 'prompt' && (
                    <div className="prompt-content">
                        <div className="icon-circle">
                            <CheckCircle size={32} />
                        </div>
                        <h3>Asset Created Successfully!</h3>
                        <p>Do you want to assign <strong>{assetName}</strong> to an employee now?</p>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={handleClose}>No, Later</button>
                            <button className="btn-primary" onClick={() => setStep('search')}>Yes, Assign</button>
                        </div>
                    </div>
                )}

                {step === 'search' && (
                    <div className="search-content">
                        <h3>Assign Asset</h3>
                        <p>Search employee by ID to assign <strong>{assetName}</strong></p>

                        <div className="search-group">
                            <input
                                type="text"
                                placeholder="Enter Employee ID (e.g. EMP001)"
                                value={empId}
                                onChange={(e) => setEmpId(e.target.value)}
                            />
                            <button className="btn-search" onClick={handleSearch}>
                                <Search size={18} />
                            </button>
                        </div>

                        {error && <p className="error-msg"><AlertCircle size={14} /> {error}</p>}

                        {employee && (
                            <div className="employee-card animate-fade">
                                <div className="emp-avatar">
                                    <User size={24} />
                                </div>
                                <div className="emp-info">
                                    <h4>{employee.name}</h4>
                                    <span>{employee.designation} • {employee.dept}</span>
                                </div>
                            </div>
                        )}

                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setStep('prompt')}>Back</button>
                            <button
                                className="btn-primary"
                                disabled={!employee}
                                onClick={handleAssign}
                            >
                                Confirm Assignment
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.5);
                    backdrop-filter: blur(5px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2100;
                    padding: 1rem;
                }

                .modal-container {
                    background: white;
                    width: 100%;
                    max-width: 450px;
                    border-radius: 16px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                    position: relative;
                    overflow: hidden;
                    padding: 2rem;
                    text-align: center;
                }

                .close-btn-abs {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    background: transparent;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                }

                .animate-pop { animation: pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
                .animate-fade { animation: fade 0.3s ease-out; }
                
                @keyframes pop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                @keyframes fade { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

                .icon-circle {
                    width: 64px;
                    height: 64px;
                    background: #dcfce7;
                    color: #16a34a;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                }

                h3 { color: #1e293b; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
                p { color: #64748b; font-size: 0.9rem; margin-bottom: 2rem; line-height: 1.5; }
                strong { color: #334155; }

                .modal-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                }

                .btn-primary, .btn-secondary {
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 0.875rem;
                    cursor: pointer;
                    flex: 1;
                }

                .btn-primary { background: #2563eb; color: white; border: none; }
                .btn-primary:hover { background: #1d4ed8; }
                .btn-primary:disabled { background: #94a3b8; cursor: not-allowed; }

                .btn-secondary { background: white; border: 1px solid #e2e8f0; color: #475569; }
                .btn-secondary:hover { background: #f8fafc; }

                /* Search Styles */
                .search-group {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                }

                .search-group input {
                    flex: 1;
                    padding: 0.75rem;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    font-size: 0.9rem;
                    outline: none;
                }

                .search-group input:focus { border-color: #2563eb; }

                .btn-search {
                    background: #eff6ff;
                    color: #2563eb;
                    border: 1px solid #dbeafe;
                    border-radius: 8px;
                    width: 42px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }

                .btn-search:hover { background: #dbeafe; }

                .error-msg {
                    color: #ef4444;
                    font-size: 0.8rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.25rem;
                    margin-top: -1rem;
                    margin-bottom: 1rem;
                }

                .employee-card {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    text-align: left;
                }

                .emp-avatar {
                    width: 40px;
                    height: 40px;
                    background: #e2e8f0;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #64748b;
                }

                .emp-info h4 { margin: 0; font-size: 0.95rem; color: #1e293b; }
                .emp-info span { font-size: 0.8rem; color: #64748b; }
            `}</style>
        </div>
    );
};

export default AssignAssetModal;
