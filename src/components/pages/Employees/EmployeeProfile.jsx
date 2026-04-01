import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Briefcase, 
  Calendar, 
  CreditCard, 
  ShieldCheck, 
  Droplet,
  MapPin
} from 'lucide-react';
import apiService from '../../../services/api';
import Toast from '../../common/Toast';

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        // apiService.getEmployeeDetail already handles normalization/scavenging
        const data = await apiService.getEmployeeDetail(id);
        if (!data) throw new Error("Employee not found");
        setEmployee(data);
      } catch (err) {
        console.error("❌ Failed to load employee profile:", err);
        setToast({ show: true, message: err.message || "Failed to load profile", type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>Loading employee profile...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="profile-error">
        <ShieldCheck size={48} color="var(--danger)" />
        <h2>Profile Not Found</h2>
        <p>We couldn't retrieve the details for this employee.</p>
        <button onClick={() => navigate('/employees')} className="primary-btn">
          Back to Directory
        </button>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <Toast 
        message={toast.show ? toast.message : ''}
        type={toast.type} 
        onClose={() => setToast({ ...toast, show: false })} 
      />

      {/* Header / Navigation */}
      <div className="profile-header">
        <button onClick={() => navigate('/employees')} className="back-link">
          <ArrowLeft size={18} />
          <span>Back to Directory</span>
        </button>
        <div className="header-actions">
          <span className={`status-pill ${employee.status?.toLowerCase()}`}>
            {employee.status || 'Unknown'}
          </span>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="overview-card card">
        <div className="profile-hero">
          <div className="profile-avatar">
            {employee.name ? employee.name.split(' ').map(n => n[0]).join('') : <User size={32} />}
          </div>
          <div className="profile-main-info">
            <h1>{employee.name || "N/A"}</h1>
            <p className="emp-code">{employee.empCode || employee.employeeId || "No Employee Code"}</p>
            <div className="info-tags">
              <span className="tag"><Building2 size={14} /> {employee.deptName || employee.dept || "No Department"}</span>
              <span className="tag"><Briefcase size={14} /> {employee.roleName || employee.role || "No Role"}</span>
            </div>
          </div>
        </div>
        
        <div className="quick-stats">
          <div className="stat">
            <Mail size={16} />
            <div>
              <label>Email</label>
              <p>{employee.email || "No email provided"}</p>
            </div>
          </div>
          <div className="stat">
            <Phone size={16} />
            <div>
              <label>Phone</label>
              <p>{employee.phone || "No phone provided"}</p>
            </div>
          </div>
          <div className="stat">
            <Calendar size={16} />
            <div>
              <label>Onboarding Date</label>
              <p>{employee.onboardingDate || "Pending"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Sections Grid */}
      <div className="detail-grid">
        {/* Personal Details */}
        <section className="detail-section card">
          <div className="section-title">
            <User size={18} className="icon-blue" />
            <h3>Personal Information</h3>
          </div>
          <div className="grid-2-col">
            <div className="field">
              <label>Father's Name</label>
              <p>{employee.fathersName || '—'}</p>
            </div>
            <div className="field">
              <label>Mother's Name</label>
              <p>{employee.mothersName || '—'}</p>
            </div>
            <div className="field">
              <label>Date of Birth</label>
              <p>{employee.dateOfBirth || '—'}</p>
            </div>
            <div className="field">
              <label><Droplet size={14} color="#ef4444" /> Blood Group</label>
              <p>{employee.bloodGroup ?? '—'}</p>
            </div>
          </div>
        </section>

        {/* Financial Details */}
        <section className="detail-section card">
          <div className="section-title">
            <CreditCard size={18} className="icon-green" />
            <h3>Financial & Bank Details</h3>
          </div>
          <div className="grid-2-col">
            <div className="field">
              <label>Bank Name</label>
              <p>{employee.bankName || '—'}</p>
            </div>
            <div className="field">
              <label>Branch</label>
              <p>{employee.branchName || '—'}</p>
            </div>
            <div className="field full-width">
              <label>Account Number</label>
              <p className="monospace">{employee.accountNumber || '—'}</p>
            </div>
            <div className="field">
              <label>IFSC Code</label>
              <p className="monospace">{employee.ifscCode || '—'}</p>
            </div>
          </div>
        </section>

        {/* Proofs & KYC */}
        <section className="detail-section card">
          <div className="section-title">
            <ShieldCheck size={18} className="icon-purple" />
            <h3>KYC & Identification</h3>
          </div>
          <div className="grid-2-col">
            <div className="field">
              <label>PAN Number</label>
              <p className="monospace">{employee.panNumber || '—'}</p>
            </div>
            <div className="field">
              <label>AADHAAR Number</label>
              <p className="monospace">{employee.aadharNumber || '—'}</p>
            </div>
          </div>
        </section>

        {/* Address Information (If salvaged) */}
        <section className="detail-section card">
          <div className="section-title">
            <MapPin size={18} className="icon-orange" />
            <h3>Addresses</h3>
          </div>
          <div className="field full-width">
            <label>Present Address</label>
            <p>{employee.presentAddress || '—'}</p>
          </div>
          <div className="field full-width mt-4">
            <label>Permanent Address</label>
            <p>{employee.permanentAddress || '—'}</p>
          </div>
        </section>
      </div>

      <style>{`
        .profile-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          animation: fadeIn 0.3s ease-out;
        }

        .profile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .back-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: none;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .back-link:hover {
          color: var(--primary);
          transform: translateX(-4px);
        }

        .status-pill {
          padding: 0.35rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-pill.active { background: #dcfce7; color: #15803d; }
        .status-pill.onboarding { background: #fef9c3; color: #854d0e; }
        .status-pill.inactive { background: #fee2e2; color: #b91c1c; }

        .overview-card {
          padding: 2.5rem;
          margin-bottom: 2rem;
          background: linear-gradient(to right, #ffffff, #f8faff);
        }

        .profile-hero {
          display: flex;
          gap: 2rem;
          align-items: center;
          margin-bottom: 2.5rem;
        }

        .profile-avatar {
          width: 100px;
          height: 100px;
          background: var(--primary);
          color: white;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          font-weight: 700;
          box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.2);
        }

        .profile-main-info h1 {
          font-size: 2rem;
          font-weight: 800;
          color: var(--text-main);
          margin-bottom: 0.25rem;
        }

        .emp-code {
          color: var(--text-muted);
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .info-tags {
          display: flex;
          gap: 1rem;
        }

        .tag {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: #f1f5f9;
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #475569;
        }

        .quick-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          padding-top: 2rem;
          border-top: 1px solid var(--divider);
        }

        .stat {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
          color: #64748b;
        }

        .stat label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 0.15rem;
          color: #94a3b8;
        }

        .stat p {
          color: var(--text-main);
          font-weight: 600;
          font-size: 0.9375rem;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }

        .detail-section {
          padding: 1.75rem;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--divider);
        }

        .section-title h3 {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .grid-2-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .field.full-width {
          grid-column: span 2;
        }

        .field label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #94a3b8;
        }

        .field p {
          font-weight: 600;
          color: var(--text-main);
        }

        .monospace {
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          letter-spacing: 0.05em;
          color: #334155 !important;
        }

        .icon-blue { color: #3b82f6; }
        .icon-green { color: #10b981; }
        .icon-purple { color: #8b5cf6; }
        .icon-orange { color: #f59e0b; }

        .profile-loading {
          height: 60vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          color: var(--text-muted);
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f1f5f9;
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 991px) {
          .detail-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 640px) {
          .quick-stats { grid-template-columns: 1fr; gap: 1rem; }
          .grid-2-col { grid-template-columns: 1fr; }
          .field.full-width { grid-column: span 1; }
          .profile-hero { flex-direction: column; text-align: center; }
          .info-tags { justify-content: center; }
        }
      `}</style>
    </div>
  );
};

export default EmployeeProfile;
