import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Building2, Mail, Calendar, Edit3, Phone, ShieldCheck, Tag, Briefcase } from 'lucide-react';

const EditEmployeeModal = ({ isOpen, onClose, onUpdate, employee, departments = [], roles = [], entities = [] }) => {
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
        status: 'ACTIVE'
    });

    const getDeptName = d => d.deptName || d.name || d.departmentName || d;
    const getDeptCode = d => d.deptCode || d.deptId || d.id;

    const getRoleName = r => r.roleName || r.name || r;
    const getRoleCode = r => r.roleCode || r.roleId || r.id;

    const getEntityName = e => e.entityName || e.name || e;
    const getEntityCode = e => e.entityCode || e.entityId || e.id;

    useEffect(() => {
        if (employee) {
            // Employee is ALREADY normalized by the API layer.
            // Use flat field names from the locked contract.
            const findSelected = (val, list, codeFn, nameFn) => {
                if (!val) return '';
                const foundByCode = list.find(item => codeFn(item) === val);
                if (foundByCode) return codeFn(foundByCode);
                const foundByName = list.find(item => nameFn(item) === val);
                if (foundByName) return codeFn(foundByName);
                return val;
            };

            setFormData({
                name: employee.name || '',
                department: findSelected(
                    employee.dept || employee.deptName,
                    departments, getDeptCode, getDeptName
                ),
                entity: findSelected(
                    employee.entity || employee.entityName,
                    entities, getEntityCode, getEntityName
                ),
                role: findSelected(
                    employee.role || employee.roleName,
                    roles, getRoleCode, getRoleName
                ),
                dateOfInterview: employee.dateOfInterview || '',
                dateOfOnboarding: employee.onboardingDate || '',
                dateOfBirth: employee.dateOfBirth || '',
                email: employee.email || '',
                phone: employee.phone || '',
                status: employee.status || 'ACTIVE'
            });
        }
    }, [employee, departments, roles, entities]);

    if (!isOpen || !employee) return null;

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.name || !formData.department || !formData.role || !formData.email || !formData.phone || !formData.entity) {
            alert('Please fill in all required fields.');
            return;
        }

        onUpdate(formData);
        onClose();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content animate-slide-up" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="header-icon">
                        <Edit3 size={24} />
                    </div>
                    <div className="header-text">
                        <h2>Edit Employee Profile</h2>
                        <p className="subtitle">Update records for {employee.name}.</p>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="employee-form">
                    <div className="form-section">
                        <div className="form-row">
                            <div className="form-group">
                                <label><UserIcon size={14} /> Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div className="form-group">
                                <label><Mail size={14} /> Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="john@example.com"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label><Building2 size={14} /> Department</label>
                                <select
                                    name="department"
                                    value={formData.department}
                                    onChange={handleChange}
                                    className="form-select"
                                    required
                                >
                                    <option value="">Select Department</option>
                                    {(departments || []).map(dept => (
                                        <option key={getDeptCode(dept)} value={getDeptCode(dept)}>{getDeptName(dept)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label><Briefcase size={14} /> Role / Designation</label>
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className="form-select"
                                    required
                                >
                                    <option value="">Select Role</option>
                                    {(roles || []).map(role => (
                                        <option key={getRoleCode(role)} value={getRoleCode(role)}>{getRoleName(role)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label><Building2 size={14} /> Entity</label>
                                <select
                                    name="entity"
                                    value={formData.entity}
                                    onChange={handleChange}
                                    className="form-select"
                                    required
                                >
                                    <option value="">Select Entity</option>
                                    {(entities || []).map(ent => (
                                        <option key={getEntityCode(ent)} value={getEntityCode(ent)}>{getEntityName(ent)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label><Phone size={14} /> Phone Number</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                    placeholder="+91 XXXXX XXXXX"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label><Calendar size={14} /> Date of Birth</label>
                                <input
                                    type="date"
                                    name="dateOfBirth"
                                    value={formData.dateOfBirth}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label><Calendar size={14} /> Date of Interview</label>
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
                                <label><Calendar size={14} /> Date of Onboarding</label>
                                <input
                                    type="date"
                                    name="dateOfOnboarding"
                                    value={formData.dateOfOnboarding}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label><ShieldCheck size={14} /> Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="form-select"
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                    <option value="ONBOARDING">Onboarding</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
                        <button type="submit" className="primary-btn">Update Profile</button>
                    </div>
                </form>
            </div>

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
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                }

                .modal-header {
                    padding: 1.5rem 2rem;
                    border-bottom: 1px solid var(--divider);
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                    background: #f8fafc;
                }

                .header-icon {
                    width: 48px;
                    height: 48px;
                    background: #e0f2fe;
                    color: #0ea5e9;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .header-text h2 {
                    font-size: 1.25rem;
                    font-weight: 800;
                    margin-bottom: 0.125rem;
                }

                .subtitle {
                    font-size: 0.8125rem;
                    color: var(--text-muted);
                }

                .close-btn {
                    margin-left: auto;
                    background: white;
                    border: 1px solid var(--divider);
                    padding: 0.5rem;
                    border-radius: 8px;
                    cursor: pointer;
                }

                .close-btn:hover {
                    background: #fee2e2;
                    color: #ef4444;
                }

                .employee-form {
                    padding: 2rem;
                }

                .form-section {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.25rem;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .form-group.full-width {
                    grid-column: 1 / -1;
                }

                .form-group label {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .form-group input, 
                .form-group select {
                    padding: 0.75rem 1rem;
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    font-size: 0.875rem;
                    outline: none;
                }

                .form-group input:focus, 
                .form-group select:focus {
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                }

                .readonly-field {
                    background: #f8fafc;
                    color: var(--text-muted);
                    cursor: not-allowed;
                }

                .modal-footer {
                    padding: 1.5rem 2rem;
                    background: #f8fafc;
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                    border-top: 1px solid var(--divider);
                }

                .primary-btn {
                    background: var(--primary);
                    color: white;
                    padding: 0.75rem 1.75rem;
                    border-radius: 10px;
                    font-weight: 700;
                    cursor: pointer;
                }

                .secondary-btn {
                    background: white;
                    border: 1px solid var(--border-color);
                    padding: 0.75rem 1.75rem;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                }

                .animate-slide-up {
                    animation: slideUp 0.3s ease-out;
                }

                @keyframes slideUp {
                    from { transform: translateY(10px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                @media (max-width: 640px) {
                    .form-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
};

export default EditEmployeeModal;
