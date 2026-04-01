import React, { useState, useEffect } from 'react';
import { Search, Menu, User } from 'lucide-react';

const Header = ({ toggleSidebar, toggleProfile }) => {
  const [userName, setUserName] = useState('Admin');
  const [userRole, setUserRole] = useState('Super Admin');

  useEffect(() => {
    // Try to parse the user object from localStorage
    try {
      const storedUserStr = localStorage.getItem('user');
      if (storedUserStr) {
        const storedUser = JSON.parse(storedUserStr);
        if (storedUser.fullName || storedUser.name) {
          setUserName(storedUser.fullName || storedUser.name);
        }
        if (storedUser.role) {
          setUserRole(storedUser.role);
        }
      }
    } catch (e) {
      console.warn("Could not parse user from localStorage", e);
    }
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        <button className="mobile-toggle" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
      </div>

      <div className="header-right">


        <div className="user-profile" onClick={toggleProfile} style={{ cursor: 'pointer' }}>
          <div className="user-info">
            <span className="user-name">{userName}</span>
            <span className="user-role">{userRole}</span>
          </div>
          <div className="avatar">
            <User size={20} />
          </div>
        </div>
      </div>

      <style>{`
        .header {
          height: var(--header-height);
          background: var(--bg-header);
          border-bottom: 1px solid var(--border-color);
          position: fixed;
          top: 0;
          right: 0;
          left: var(--sidebar-width);
          z-index: 900;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 var(--padding-md);
          transition: left 0.3s ease;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }

        .mobile-toggle {
          display: none;
          background: none;
          color: var(--text-muted);
        }

        .search-bar {
          position: relative;
          max-width: 400px;
          width: 100%;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .search-bar input {
          width: 100%;
          padding: 0.6rem 1rem 0.6rem 2.5rem;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: var(--bg-main);
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .search-bar input:focus {
          border-color: var(--primary);
          background: white;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }



        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding-left: 1.5rem;
          border-left: 1px solid var(--divider);
        }

        .user-info {
          display: flex;
          flex-direction: column;
          text-align: right;
        }

        .user-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .user-role {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .avatar {
          width: 36px;
          height: 36px;
          background: var(--bg-main);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          border: 1px solid var(--border-color);
        }

        @media (max-width: 768px) {
          .header {
            left: 0;
          }
          .mobile-toggle {
            display: block;
          }
          .user-info {
            display: none;
          }
        }
      `}</style>
    </header>
  );
};

export default Header;
