import React, { useState } from 'react';
import { X } from 'lucide-react';

const AddEmployeeModal = ({ isOpen, onClose, onAdd, departments = [], roles = [], entities = [] }) => {
    const [formData, setFormData] = useState({
        name: '',
        department: '',
        entity: '',
        role: '',
        dateOfInterview: '',
        dateOfOnboarding: '',
        dateOfBirth: '',
        email: '',
        phone: '',
        status: 'ONBOARDING'
    });

    const getDeptName = d => d.deptName || d.name || d.departmentName || d;
    const getDeptCode = d => d.deptCode || d.deptId || d.id;

    const getRoleName = r => r.roleName || r.name || r;
    const getRoleCode = r => r.roleCode || r.roleId || r.id;

    const getEntityName = e => e.entityName || e.name || e;
    const getEntityCode = e => e.entityCode || e.entityId || e.id;

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();

        // Basic Validation
        if (!formData.name || !formData.email || !formData.phone || !formData.department || !formData.role || !formData.entity) {
            alert('Please fill in all required fields.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            alert('Please enter a valid email address.');
            return;
        }

        onAdd(formData);
        // Reset form
        setFormData({
            name: '',
            department: '',
            entity: '',
            role: '',
            dateOfInterview: '',
            dateOfOnboarding: '',
            dateOfBirth: '',
            email: '',
            phone: '',
            status: 'ONBOARDING'
        });
        onClose();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2>Add New Employee</h2>
                        <p className="subtitle">Create a new employee record in the directory.</p>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="employee-form">
                    <div className="form-section">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter full name"
                                />
                            </div>
                            <div className="form-group">
                                <label>Email ID</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="example@company.com"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Department</label>
                                <select
                                    name="department"
                                    value={formData.department}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select Department</option>
                                    {(departments || []).map(dept => (
                                        <option key={getDeptCode(dept)} value={getDeptCode(dept)}>
                                            {getDeptName(dept)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Role & Designation</label>
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select Role</option>
                                    {(roles || []).map(role => (
                                        <option key={getRoleCode(role)} value={getRoleCode(role)}>
                                            {getRoleName(role)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Entity</label>
                                <select
                                    name="entity"
                                    value={formData.entity}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select Entity</option>
                                    {(entities || []).map(ent => (
                                        <option key={getEntityCode(ent)} value={getEntityCode(ent)}>
                                            {getEntityName(ent)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Phone Number</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter phone number"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Date of Birth</label>
                                <input
                                    type="date"
                                    name="dateOfBirth"
                                    value={formData.dateOfBirth}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Date of Interview</label>
                                <input
                                    type="date"
                                    name="dateOfInterview"
                                    value={formData.dateOfInterview}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Date of Onboarding</label>
                                <input
                                    type="date"
                                    name="dateOfOnboarding"
                                    value={formData.dateOfOnboarding}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="primary-btn">Create Employee</button>
                    </div>
                </form>
            </div >

            <style>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(15, 23, 42, 0.4);
                    backdrop-filter: blur(8px);
                    display: flex;
                    justify-content: center;
                    z-index: 9999;
                    padding: 2rem 1rem;
                    overflow-y: auto;
                }
                
                .modal-content {
                    width: 100%;
                    max-width: 600px;
                    background: white;
                    border-radius: 16px;
                    margin: auto;
                    position: relative;
                    overflow: visible;
                    box-shadow: 
                        0 20px 25px -5px rgba(0, 0, 0, 0.1),
                        0 10px 10px -5px rgba(0, 0, 0, 0.04),
                        0 0 0 1px rgba(0, 0, 0, 0.05);
                }

                .modal-header {
                    padding: 1.5rem;
                    border-bottom: 1px solid var(--divider);
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }

                .modal-header h2 {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--text-main);
                    margin-bottom: 0.25rem;
                }

                .subtitle {
                    font-size: 0.875rem;
                    color: var(--text-muted);
                }

                .close-btn {
                    background: none;
                    color: var(--text-muted);
                    padding: 0.5rem;
                    border-radius: 6px;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .close-btn:hover {
                    background: var(--bg-main);
                    color: var(--text-main);
                }

                .employee-form {
                    padding: 1.5rem;
                }

                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }

                .full-width {
                    grid-column: span 2;
                }

                .form-group label {
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: var(--text-main);
                }

                .form-group input, 
                .form-group select {
                    padding: 0.625rem 0.875rem;
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    font-size: 0.875rem;
                    outline: none;
                    transition: all 0.2s;
                }

                .form-group input:focus, 
                .form-group select:focus {
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                }

                .modal-footer {
                    padding: 1.5rem;
                    background: var(--bg-main);
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.75rem;
                    margin: 0.5rem -1.5rem -1.5rem -1.5rem;
                }

                .primary-btn {
                    background: var(--primary);
                    color: white;
                    padding: 0.625rem 1.25rem;
                    border-radius: 6px;
                    font-weight: 600;
                    font-size: 0.875rem;
                }

                .secondary-btn {
                    background: white;
                    border: 1px solid var(--border-color);
                    color: var(--text-main);
                    padding: 0.625rem 1.25rem;
                    border-radius: 6px;
                    font-weight: 600;
                    font-size: 0.875rem;
                }

                @media (max-width: 640px) {
                    .form-row {
                        grid-template-columns: 1fr;
                    }
                    .full-width {
                        grid-column: span 1;
                    }
                }
            `}</style>
        </div >
    );
};

export default AddEmployeeModal;
