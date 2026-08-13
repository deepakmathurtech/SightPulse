import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, User, Lock, ArrowRight, Satellite, Activity } from 'lucide-react';

export default function Login() {
  const { login, loading } = useAuth();
  const [email, setEmail]   = useState('alex@student.edu');
  const [password, setPassword] = useState('password123');
  const [error, setError]   = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try { await login(email, password); }
    catch (err) { setError(err.message); }
  };

  const roles = [
    { emoji: '👨‍🎓', label: 'Student', email: 'alex@student.edu' },
    { emoji: '👨‍🏫', label: 'Teacher', email: 'turing@college.edu' },
    { emoji: '🛠️',  label: 'Admin',   email: 'admin@college.edu' }
  ];

  return (
    <div className="login-page">
      {/* Decorative background orbs */}
      <div style={{ position: 'fixed', top: '20%', left: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '20%', right: '10%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="login-card fade-in">
        <div className="login-logo">
          <div className="login-logo-icon">
            <ShieldCheck size={34} color="#fff" />
          </div>
          <div>
            <div className="login-title">SightPulse</div>
            <div className="login-sub">
              Geo-Location AI Attendance Verification<br />
              with OpenCV Camera Security
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 14 }}>
            <Activity size={15} />
            {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <div className="input-icon-wrap">
              <User size={16} className="icon-left" />
              <input
                type="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="name@college.edu"
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="input-icon-wrap">
              <Lock size={16} className="icon-left" />
              <input
                type="password"
                className="input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? (
              <><span className="spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} /> Authenticating…</>
            ) : (
              <> <ShieldCheck size={17} /> Sign In to Portal <ArrowRight size={17} /> </>
            )}
          </button>
        </form>

        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--txt-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 10 }}>
            Demo Role Presets
          </div>
          <div className="role-presets">
            {roles.map(r => (
              <button
                key={r.label}
                className="role-preset-btn"
                onClick={() => { setEmail(r.email); setPassword('password123'); }}
              >
                <span style={{ display: 'block', fontSize: '1.2rem', marginBottom: 3 }}>{r.emoji}</span>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 20, padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <div style={{ fontSize: '0.74rem', color: '#a5b4fc', lineHeight: 1.6 }}>
            <strong>Prototype:</strong> GPS snaps to classroom coords for demo purposes. Wi-Fi BSSID simulated. All passwords are <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 3 }}>password123</code>.
          </div>
        </div>
      </div>
    </div>
  );
}
