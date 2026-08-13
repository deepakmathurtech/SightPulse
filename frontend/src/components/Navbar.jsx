import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, MapPin, Cpu, Camera, Activity, LayoutDashboard, Settings } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout } = useAuth();

  const roleTabs = {
    student: [
      { id: 'checkin', label: 'My Attendance', icon: MapPin }
    ],
    teacher: [
      { id: 'session', label: 'Live Session', icon: Activity },
      { id: 'staff-face', label: 'Face Audit', icon: Camera },
      { id: 'workers', label: 'Workers', icon: Cpu }
    ],
    admin: [
      { id: 'classrooms', label: 'Classrooms', icon: LayoutDashboard },
      { id: 'workers', label: 'Workers', icon: Cpu },
      { id: 'settings', label: 'Settings', icon: Settings }
    ]
  };

  const tabs = user ? (roleTabs[user.role] || []) : [];

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="brand-icon">
          <ShieldCheck size={22} color="#fff" />
        </div>
        <div>
          <div className="brand-name">Sight<span>Pulse</span></div>
          <div className="brand-sub">Geo-Location AI Attendance</div>
        </div>
      </div>

      {user && tabs.length > 0 && (
        <div className="navbar-nav">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-btn ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      )}

      {user && (
        <div className="navbar-user">
          <div className="user-pill">
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#fff', lineHeight: 1.2 }}>{user.name}</div>
              <span className={`badge badge-${
                user.role === 'student' ? 'green' :
                user.role === 'teacher' ? 'yellow' :
                user.role === 'admin' ? 'indigo' : 'cyan'
              }`} style={{ fontSize: '0.65rem', padding: '2px 7px' }}>
                {user.role}
              </span>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={logout}
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </nav>
  );
}
