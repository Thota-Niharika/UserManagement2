import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserSquare2,
  Truck,
  Package,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus
} from 'lucide-react';
import apiService from '../../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [recentEmployees, setRecentEmployees] = useState([]);
  const [counts, setCounts] = useState({
    employees: 0,
    vendors: 0,
    assets: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [empList, vendorData, assetData] = await Promise.all([
          apiService.getEmployees(), // ← Returns pre-normalized flat array
          apiService.getVendors(),
          apiService.getAssets()
        ]);

        const vendorList = Array.isArray(vendorData) ? vendorData : (vendorData?.data || []);
        const assetList = Array.isArray(assetData) ? assetData : (assetData?.data || []);

        setEmployees(empList);
        setCounts({
          employees: empList.length,
          vendors: vendorList.length,
          assets: assetList.length
        });

        // Get last 5 employees
        setRecentEmployees([...empList].reverse().slice(0, 5));

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, []);

  const kpis = [
    { title: 'Total Employees', value: counts.employees.toString(), icon: <UserSquare2 />, color: 'var(--success)', trend: 'Live', up: true },
    { title: 'Active Vendors', value: counts.vendors.toString(), icon: <Truck />, color: 'var(--info)', trend: 'Live', up: true },
    { title: 'Total Assets', value: counts.assets.toString(), icon: <Package />, color: 'var(--warning)', trend: 'Live', up: true },
  ];

  return (
    <div className="dashboard-page animate-fade-in">
      <header className="page-header">
        <h1>Dashboard Overview</h1>
        <p>Operational summary and recent system activities.</p>
      </header>

      <div className="kpi-grid">
        {kpis.map((kpi, i) => (
          <div key={i} className="card kpi-card">
            <div className="kpi-icon" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>
              {kpi.icon}
            </div>
            <div className="kpi-info">
              <span className="kpi-title">{kpi.title}</span>
              <div className="kpi-value-row">
                <span className="kpi-value">{kpi.value}</span>
                <span className={`kpi-trend ${kpi.up ? 'up' : 'down'}`}>
                  {kpi.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {kpi.trend}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-content-grid">
        <div className="card recent-activity">
          <div className="card-header">
            <h3>Recently Added Employees</h3>
            <button className="text-btn" onClick={() => navigate('/employees')}>View All</button>
          </div>
          <div className="activity-list">
            {recentEmployees.length > 0 ? (
              recentEmployees.map((emp) => (
                <div key={emp.id} className="activity-item">
                  <div className="activity-icon-wrapper">
                    <UserPlus size={16} color="var(--success)" />
                  </div>
                  <div className="activity-details">
                    <p className="activity-text">
                      <strong>{emp.name}</strong> was onboarded as <span>{emp.roleName}</span>
                    </p>
                    <div className="activity-meta">
                      <span className="activity-time">
                        <Calendar size={12} /> {emp.onboardingDate || 'N/A'}
                      </span>
                      <span className="activity-dept">{emp.deptName}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No recent employees found.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-page {
          animation: fadeIn 0.6s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: -0.02em;
          margin-bottom: 0.25rem;
        }

        .page-header p {
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.25rem;
          margin-bottom: 2rem;
        }

        .kpi-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-sm);
          background: radial-gradient(circle at top left, rgba(37, 99, 235, 0.08), #ffffff);
          transition: transform 0.18s ease-out, box-shadow 0.18s ease-out, border-color 0.18s ease-out;
        }

        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: rgba(37, 99, 235, 0.25);
        }

        .kpi-icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .kpi-info {
          flex: 1;
        }

        .kpi-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .kpi-value-row {
          display: flex;
          align-items: baseline;
          gap: 0.75rem;
          margin-top: 0.25rem;
        }

        .kpi-value {
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .kpi-trend {
          font-size: 0.75rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .kpi-trend.up { color: var(--success); }
        .kpi-trend.down { color: var(--danger); }

        .dashboard-content-grid {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
          gap: 1.5rem;
          align-items: flex-start;
        }

        .recent-activity {
          grid-column: 1 / -1;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .card-header h3 {
          font-size: 1rem;
          font-weight: 600;
        }

        .text-btn {
          background: none;
          color: var(--primary);
          font-size: 0.875rem;
          font-weight: 600;
        }

        .activity-item {
          display: flex;
          gap: 1rem;
          padding: 1rem 0;
          border-bottom: 1px solid var(--divider);
        }

        .activity-item:last-child {
          border-bottom: none;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-top: 6px;
        }

        .status-dot.success { background: var(--success); }
        .status-dot.danger { background: var(--danger); }
        .status-dot.info { background: var(--info); }
        .status-dot.warning { background: var(--warning); }

        .activity-icon-wrapper {
          width: 36px;
          height: 36px;
          background: rgba(34, 197, 94, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .activity-meta {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-top: 0.25rem;
          flex-wrap: wrap;
        }

        .activity-time {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .activity-dept {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--primary);
          background: rgba(37, 99, 235, 0.05);
          padding: 0.125rem 0.5rem;
          border-radius: 4px;
        }

        .empty-state {
          padding: 2rem;
          text-align: center;
          color: var(--text-muted);
        }

        .activity-text {
          font-size: 0.875rem;
          color: var(--text-main);
        }

        .activity-text span {
          color: var(--text-muted);
        }

        .health-stats {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .health-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
        }

        .text-secondary {
          color: var(--text-muted);
          font-weight: 500;
        }

        @media (max-width: 1024px) {
          .kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .dashboard-content-grid {
            grid-template-columns: 1fr;
          }

          .recent-activity {
            grid-column: 1;
          }
        }

        @media (max-width: 640px) {
          .kpi-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
