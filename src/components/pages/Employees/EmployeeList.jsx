import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  Edit3,
  Trash2,
  Search,
  Filter,
  X,
  CheckCircle2,
} from 'lucide-react';
import { hasWorkingDaysPassed } from '../../../utils/dateUtils';
import AddEmployeeModal from './AddEmployeeModal';
import EditEmployeeModal from './EditEmployeeModal';
import ViewEmployeeModal from './ViewEmployeeModal';
import apiService from '../../../services/api';
import Toast from '../../common/Toast';
import { buildFileUrl } from '../../../utils/file';

const EmployeeList = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    department: 'All',
    status: 'All',
    entity: 'All',
    assignmentStatus: 'All'
  });

  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [entities, setEntities] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const getDeptName = d => d.deptName || d.name || d.departmentName || d;
  const getRoleName = r => r.roleName || r.name || r;
  const getEntityName = e => e.entityName || e.name || e;

  // Ensure data is an array (for departments/roles/entities which aren't auto-normalized)
  const ensureArray = (data, context) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.content)) return data.content;
    console.warn(`⚠️ [${context}] returned unexpected shape:`, data);
    return [];
  };

  /**
   * Decorate a normalized employee with UI-only computed fields.
   * Input is ALREADY normalized by the API layer — no field guessing needed.
   */
  const decorateEmployee = (emp) => {
    if (!emp) return null;

    const status = (emp?.status || 'unknown').toLowerCase();

    // Dynamic ID display
    let displayId = emp?.id ?? "N/A";
    if (status === 'active' && hasWorkingDaysPassed(emp.onboardingDate, 10)) {
      displayId = `EMP/${displayId}`;
    }

    // Asset syncing from localStorage
    let assignments = [];
    try {
      assignments = JSON.parse(localStorage.getItem('asset_assignments') || '[]');
    } catch (e) { /* ignore */ }
    const myAssignment = Array.isArray(assignments)
      ? assignments.find(a => a.employeeName === emp.name)
      : null;

    return {
      ...emp,
      status,
      displayId,
      hasAssets: !!myAssignment,
      assignedAssetName: myAssignment ? myAssignment.assetName : null,
      assignedAssetDate: myAssignment ? myAssignment.assignedDate : null
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const [deptRes, roleRes, entRes, empList] = await Promise.all([
        apiService.getDepartments(),
        apiService.getRoles(),
        apiService.getEntities(),
        apiService.getEmployees(0, 10)
      ]);

      setDepartments(ensureArray(deptRes, 'Departments'));
      setRoles(ensureArray(roleRes, 'Roles'));
      setEntities(ensureArray(entRes, 'Entities'));

      // empList is guaranteed to be an array by the API layer (safeGet returns [])
      const decorated = (empList || []).map(decorateEmployee).filter(Boolean);
      setEmployees(decorated);
      setLoading(false);
    } catch (e) {
      console.error('❌ [fetchData] Unexpected error:', e);
      setLoading(false);
      setToast({ show: true, message: `System error. Please try again.`, type: 'error' });
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddEmployee = async (newEmployee) => {
    try {
      const createdEmployee = await apiService.createEmployee(newEmployee);
      console.log("[DEBUG] Backend Response (createEmployee):", createdEmployee);

      if (!createdEmployee) {
        throw new Error("Failed to create employee: No data returned from server.");
      }

      // 🛡️ DEDUPLICATION GUARD: Ensure we don't add the same employee twice
      const decorated = decorateEmployee(createdEmployee);

      setEmployees(prev => {
        const id = decorated?.id || decorated?.employeeId;
        const exists = prev.some(emp => (emp.id || emp.employeeId) === id);
        if (exists) {
          console.warn(`[DEDUPE] Employee ${id} already exists in list. Updating instead of appending.`);
          return prev.map(emp => (emp.id || emp.employeeId) === id ? decorated : emp);
        }
        return [...prev, decorated];
      });
      setIsAddModalOpen(false);
      setToast({
        show: true,
        message: `Employee added successfully! Code: ${decorated?.empCode || 'N/A'}. Onboarding link sent.`,
        type: 'success'
      });
    } catch (error) {
      console.error("❌ [handleAddEmployee Error]:", error);

      // 🧹 Parse ugly MySQL constraint violations into friendly messages
      let friendlyMessage = error.message || 'System error';
      if (friendlyMessage.includes('Duplicate entry')) {
        if (friendlyMessage.includes('email') || friendlyMessage.toLowerCase().includes('uk')) {
          // Try to extract the duplicate value from "Duplicate entry 'value' for key ..."
          const match = friendlyMessage.match(/Duplicate entry '([^']+)'/);
          const val = match ? match[1] : 'this value';
          friendlyMessage = `An employee with "${val}" already exists. Please use a different email or phone number.`;
        } else {
          friendlyMessage = 'A duplicate record was detected. Please check email and phone.';
        }
      }

      setToast({ 
        show: true, 
        message: friendlyMessage, 
        type: 'error' 
      });
      throw error; // Re-throw so AddEmployeeModal can keep form open
    }
  };

  const handleUpdateEmployee = async (updatedEmployee) => {
    try {
      const empId = selectedEmployee?.id;
      if (!empId) throw new Error("No employee selected for update.");

      const updated = await apiService.updateEmployee(empId, updatedEmployee);
      
      if (!updated) {
        throw new Error("Failed to update employee: No data returned from server.");
      }

      setEmployees(prev => prev.map(emp => (emp.id || emp.employeeId) === empId ? decorateEmployee(updated) : emp));
      setIsEditModalOpen(false);
      setSelectedEmployee(null);
      setToast({ show: true, message: 'Employee updated successfully!', type: 'success' });
    } catch (error) {
      console.error("❌ [handleUpdateEmployee Error]:", error);
      setToast({ 
        show: true, 
        message: 'Failed to update: ' + (error.message || 'System error'), 
        type: 'error' 
      });
    }
  };

  const handleFinalReview = async (emp, status) => {
    try {
      const empId = emp.id || emp.employeeId;
      let remarks = 'All documents verified';

      if (status === 'REJECTED') {
        remarks = window.prompt("Enter overall rejection remarks (sent via email):") || '';
        if (remarks === null) return; // Cancelled
      }

      await apiService.reviewOnboarding({
        employeeId: empId,
        status: status,
        remarks: remarks
      });

      setToast({
        show: true,
        message: `Onboarding ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully!`,
        type: 'success'
      });
      setIsViewModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to process final review:', error);
      setToast({
        show: true,
        message: 'Failed to process review: ' + error.message,
        type: 'error'
      });
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (window.confirm('Are you sure you want to deactivate this employee?')) {
      try {
        await apiService.deactivateEmployee(id);
        fetchData();
        setToast({ show: true, message: 'Employee deactivated successfully!', type: 'success' });
      } catch (error) {
        setToast({ show: true, message: 'Failed to deactivate: ' + error.message, type: 'error' });
      }
    }
  };

  const handleViewProfile = (emp) => {
    const id = emp.id || emp.employeeId;
    if (id) {
      navigate(`/employees/${id}`);
    } else {
      setToast({ show: true, message: 'Cannot open profile: employee has no ID.', type: 'error' });
    }
  };

  const handleEditEmployee = async (emp) => {
    try {
      if (emp.id) {
        setToast({ show: true, message: 'Loading details...', type: 'info' });
        const fullDetails = await apiService.getEmployeeDetail(emp.id);
        if (fullDetails) {
          console.log("🚀 [DEBUG] Normalizing fullDetails for Edit...");
          const normalized = normalizeEmployee(fullDetails, departments, roles, entities);
          const decorated = decorateEmployee(normalized);

          setSelectedEmployee(decorated);
          setIsEditModalOpen(true);
          setToast({ show: false });
          return;
        }
      }
    } catch (e) {
      console.warn('Edit context fetch failed:', e);
    }
    setSelectedEmployee(emp);
    setIsEditModalOpen(true);
  };

  const handleRejectDocument = async (doc, label) => {
    const emp = selectedEmployee;
    if (!emp) return;

    // Ask for confirmation first
    if (!window.confirm(`Are you sure you want to reject the "${label}" for ${emp.name}? This will trigger a re-onboarding email where this field will be empty.`)) {
      return;
    }

    // Prompt for rejection reason/remarks
    const remarks = window.prompt(`Enter rejection reason for "${label}" (optional):`) ?? '';

    try {
      const empId = emp.id || emp.employeeId;
      const entityId = (doc.id && !isNaN(doc.id)) ? Number(doc.id) : null;

      console.log("Reject Payload Detail:", {
        employeeId: empId,
        entityType: doc.entityType,
        entityId: entityId,
        remarks,
        fullDoc: doc
      });

      await apiService.rejectOnboardingDocument(empId, doc.entityType, entityId, remarks);

      setToast({ show: true, message: `Document "${label}" rejected. Re-onboarding email sent to ${emp.name}.`, type: 'success' });
      fetchData();
      setIsViewModalOpen(false);
    } catch (error) {
      console.error('Failed to reject document:', error);
      setToast({ show: true, message: 'Failed to reject document: ' + error.message, type: 'error' });
    }
  };

  // ── FILTERING (uses flat contract fields directly) ──
  const filteredEmployees = (employees || []).filter(emp => {
    if (!emp) return false;
    const term = (searchTerm || "").toLowerCase();
    const matchesSearch =
      (emp.name || "").toLowerCase().includes(term) ||
      String(emp.id || "").toLowerCase().includes(term) ||
      (emp.empCode || "").toLowerCase().includes(term) ||
      (emp.roleName || "").toLowerCase().includes(term) ||
      (emp.deptName || "").toLowerCase().includes(term);
    const matchesDept = activeFilters.department === 'All' || emp.deptName === activeFilters.department;
    const matchesStatus = activeFilters.status === 'All' || (emp.status || "").toLowerCase() === (activeFilters.status || "").toLowerCase();
    const matchesEntity = activeFilters.entity === 'All' || emp.entityName === activeFilters.entity;
    const matchesAssignment = activeFilters.assignmentStatus === 'All' ||
      (activeFilters.assignmentStatus === 'Assigned' ? emp.hasAssets : !emp.hasAssets);
    return matchesSearch && matchesDept && matchesStatus && matchesEntity && matchesAssignment;
  });

  const clearFilter = (key) => setActiveFilters(prev => ({ ...prev, [key]: 'All' }));
  const hasActiveFilters = Object.values(activeFilters).some(v => v !== 'All');

  const statusesList = ['All', 'Active', 'Onboarding', 'Inactive'];
  const departmentsList = ['All', ...departments.map(getDeptName)];
  const entitiesList = ['All', ...entities.map(getEntityName)];

  return (
    <div className="employees-page">
      <header className="page-header">
        <div className="header-title">
          <h1>Employee Directory</h1>
          <p>Global workforce management and HR records.</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button className="primary-btn" onClick={() => setIsAddModalOpen(true)}>Add Employee</button>
        </div>
      </header>

      <ViewEmployeeModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        employee={selectedEmployee}
        onApprove={handleFinalReview}
        onRejectDocument={handleRejectDocument}
      />

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddEmployee}
        departments={departments}
        roles={roles}
        entities={entities}
        employees={employees}
      />

      <EditEmployeeModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setSelectedEmployee(null); }}
        onUpdate={handleUpdateEmployee}
        employee={selectedEmployee}
        departments={departments}
        roles={roles}
        entities={entities}
      />

      <Toast
        message={toast.show ? toast.message : ''}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />

      <div className="table-container card">
        <div className="table-controls">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by name, code, role or department..."
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
                    <h3>Filter Directory</h3>
                    <button className="icon-btn-sm" onClick={() => setShowFilters(false)}>
                      <X size={14} />
                    </button>
                  </div>

                  <div className="popover-body">
                    <div className="filter-item">
                      <label>Department</label>
                      <select value={activeFilters.department} onChange={(e) => setActiveFilters(prev => ({ ...prev, department: e.target.value }))}>
                        {departmentsList.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                      </select>
                    </div>
                    <div className="filter-item">
                      <label>Entity</label>
                      <select value={activeFilters.entity} onChange={(e) => setActiveFilters(prev => ({ ...prev, entity: e.target.value }))}>
                        {entitiesList.map(ent => <option key={ent} value={ent}>{ent}</option>)}
                      </select>
                    </div>
                    <div className="filter-item">
                      <label>Status</label>
                      <select value={activeFilters.status} onChange={(e) => setActiveFilters(prev => ({ ...prev, status: e.target.value }))}>
                        {statusesList.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="filter-item">
                      <label>Asset Assignment</label>
                      <select value={activeFilters.assignmentStatus} onChange={(e) => setActiveFilters(prev => ({ ...prev, assignmentStatus: e.target.value }))}>
                        <option value="All">All</option>
                        <option value="Assigned">Assigned</option>
                        <option value="Unassigned">Unassigned</option>
                      </select>
                    </div>
                  </div>

                  <div className="popover-footer">
                    <button className="text-btn" onClick={() => setActiveFilters({ department: 'All', status: 'All', entity: 'All', assignmentStatus: 'All' })}>Reset All</button>
                    <button className="apply-btn" onClick={() => setShowFilters(false)}>Apply</button>
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
                  <button onClick={() => clearFilter(key)}><X size={12} /></button>
                </div>
              )
            ))}
            <button className="clear-all-link" onClick={() => setActiveFilters({ department: 'All', status: 'All', entity: 'All', assignmentStatus: 'All' })}>Clear all</button>
          </div>
        )}

        <div className="table-wrapper">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Emp ID</th>
                <th>Emp Code</th>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Entity</th>
                <th>Onboarding Date</th>
                <th>Email ID</th>
                <th>Phone Number</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp, index) => (
                  <tr key={`${emp.id || emp.employeeId || 'temp'}-${index}-${emp.email}`}>
                    <td className="emp-id-cell">{emp.employeeId || emp.id || '-'}</td>
                    <td className="emp-code-cell">{emp.empCode || '-'}</td>
                    <td className="emp-name-cell">
                      <div className="name-wrapper">
                        <div className="emp-thumbnail">
                          {emp.photoPath ? (
                            <img
                              src={buildFileUrl(emp.photoPath)}
                              alt={emp.name}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerText = (emp.name || '').split(' ').map(n => n[0]).join('');
                              }}
                            />
                          ) : (
                            (emp.name || '').split(' ').map(n => n[0]).join('')
                          )}
                        </div>
                        <span>{emp.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td>{emp?.roleName || '-'}</td>
                    <td>{emp?.deptName || '-'}</td>
                    <td>{emp?.entityName || '-'}</td>
                    <td className="no-wrap">{emp?.onboardingDate || '-'}</td>
                    <td>{emp?.email || '-'}</td>
                    <td className="no-wrap">{emp?.phone || '-'}</td>
                    <td>
                      <span className={`badge badge-${(emp?.status || 'unknown').toLowerCase()}`}>
                        {emp?.status || 'N/A'}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="action-buttons">
                        <button className="icon-btn-v3" onClick={() => handleViewProfile(emp)} title="View Profile"><Eye size={16} /></button>
                        <button className="icon-btn-v3" onClick={() => handleEditEmployee(emp)} title="Edit Employee"><Edit3 size={16} /></button>
                        <button className="icon-btn-v3 danger" onClick={() => handleDeleteEmployee(emp.id)} title="Deactivate Employee"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="text-center" style={{ padding: '3rem' }}>
                    <div className="empty-state">
                      <p>No employees found matching your criteria.</p>
                      {searchTerm && <button className="text-btn" onClick={() => setSearchTerm('')}>Clear Search</button>}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div >

      <style>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
        }

        .table-container {
          padding: 0;
          overflow: hidden;
          background: white;
          border-radius: 12px;
          border: 1px solid var(--divider);
          margin-top: 1rem;
        }

        .table-controls {
          padding: 1.25rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--divider);
          background: #fcfcfd;
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
          background: white;
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
        }

        .control-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
          background: #f8faff;
        }

        .control-btn.active {
          border-color: var(--primary);
          color: var(--primary);
          background: #eff6ff;
        }

        .filter-indicator {
          width: 6px;
          height: 6px;
          background: var(--primary);
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
          border: 1px solid var(--divider);
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
          border-bottom: 1px solid var(--divider);
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
          border-top: 1px solid var(--divider);
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
          color: var(--primary);
        }

        .apply-btn {
          background: var(--primary);
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
          border-bottom: 1px solid var(--divider);
          background: white;
        }

        .filter-badge {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: #eff6ff;
          color: var(--primary);
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
          color: var(--primary);
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
          color: var(--primary);
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

        .icon-btn-sm:hover {
          background: #f1f5f9;
          color: #475569;
        }

        .table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .employee-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1200px;
          font-size: 0.875rem;
        }

        .employee-table th {
          background: #f8fafc;
          padding: 1rem 1.5rem;
          text-align: left;
          font-weight: 600;
          color: var(--text-muted);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--divider);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .employee-table td {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--divider);
          color: var(--text-main);
          vertical-align: middle;
        }

        .employee-table tr:hover td {
          background: #f1f5f9;
        }

        .emp-id-cell {
          font-family: monospace;
          font-weight: 600;
          color: var(--primary);
        }

        .emp-name-cell .name-wrapper {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .emp-thumbnail {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--primary);
          overflow: hidden;
          border: 1px solid var(--divider);
          flex-shrink: 0;
        }

        .emp-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .mini-avatar {
          width: 32px;
          height: 32px;
          background: var(--primary);
          color: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.75rem;
        }

        .emp-name-cell span {
          font-weight: 600;
        }

        .no-wrap {
          white-space: nowrap;
        }

        .timestamp-group {
          display: flex;
          flex-direction: column;
        }

        .timestamp-group .date {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .timestamp-group .time {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-family: monospace;
        }

        .text-right {
          text-align: right !important;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
        }

        .icon-btn-v3 {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border: 1px solid var(--border-color);
          color: var(--text-muted);
          transition: all 0.2s;
        }

        .icon-btn-v3:hover {
          color: var(--primary);
          border-color: var(--primary);
          background: #eff6ff;
        }

        .icon-btn-v3.danger:hover {
          color: var(--danger);
          border-color: var(--danger);
          background: #fee2e2;
        }

        .icon-btn-v3.success:hover {
          color: #10b981;
          border-color: #10b981;
          background: #ecfdf5;
        }

        .primary-btn {
          background: var(--primary);
          color: white;
          padding: 0.6rem 1.25rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 0.875rem;
        }

        .secondary-btn {
          background: white;
          border: 1px solid var(--border-color);
          padding: 0.6rem 1.25rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 0.875rem;
        }

        @media (max-width: 640px) {
          .page-header {
            flex-direction: column;
            gap: 1rem;
          }
          .header-actions {
            width: 100%;
          }
          .header-actions button {
            flex: 1;
          }
        }
      `}</style>
    </div >
  );
};



export default EmployeeList;
