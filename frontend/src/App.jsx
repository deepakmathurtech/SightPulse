import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';

function MainApp() {
  const { user } = useAuth();
  const defaultTab = {
    student: 'checkin',
    teacher: 'session',
    admin:   'classrooms'
  };
  const [activeTab, setActiveTab] = useState(defaultTab[user?.role] || 'checkin');

  if (!user) return <Login />;

  return (
    <div className="app-root">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="page-container">
        {user.role === 'student' && <StudentDashboard />}
        {user.role === 'teacher' && <TeacherDashboard activeTab={activeTab} />}
        {user.role === 'admin'   && <AdminDashboard   activeTab={activeTab} />}
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '20px 24px', fontSize: '0.75rem', color: 'var(--txt-muted)', borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 'auto' }}>
        SightPulse · Geo-Location Attendance System with AI Security Verification · Prototype v1.0
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
