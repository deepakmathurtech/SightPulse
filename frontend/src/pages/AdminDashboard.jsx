import React, { useState } from 'react';
import WorkerMonitor from '../components/WorkerMonitor';
import { Plus, Shield, MapPin, Lock, Database, ChevronDown } from 'lucide-react';

export default function AdminDashboard({ activeTab }) {
  const [form, setForm] = useState({
    name: 'ME-201 Engineering Hall',
    code: 'ME-201',
    latitude: 12.9725,
    longitude: 77.5955,
    radiusMeters: 30,
    bssidWhitelist: 'A4:3B:CC:12:45:90, ME_HALL_WIFI',
    seatRows: 6,
    seatCols: 8,
    cameraUrl: 'rtsp://192.168.1.108/live/me201'
  });
  const [msg, setMsg]   = useState(null); // { type, text }

  const update = key => e => setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleCreate = async e => {
    e.preventDefault();
    setMsg(null);
    try {
      const res  = await fetch('/api/classrooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sih_token')}`
        },
        body: JSON.stringify({
          ...form,
          latitude:      parseFloat(form.latitude),
          longitude:     parseFloat(form.longitude),
          radiusMeters:  parseFloat(form.radiusMeters),
          seatRows:      parseInt(form.seatRows, 10),
          seatCols:      parseInt(form.seatCols, 10),
          bssidWhitelist: form.bssidWhitelist.split(',').map(s => s.trim())
        })
      });
      const data = await res.json();
      setMsg(res.ok
        ? { type: 'success', text: `✓ Classroom "${form.name}" created successfully! ID: ${data.id}` }
        : { type: 'error',   text: data.error || 'Create failed' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  if (activeTab === 'workers')  return <WorkerMonitor />;

  const fields = [
    { key: 'name',      label: 'Classroom Name',      type: 'text',   span: 2 },
    { key: 'code',      label: 'Code / Abbreviation', type: 'text',   span: 1 },
    { key: 'radiusMeters', label: 'Geofence Radius (m)', type: 'number', span: 1 },
    { key: 'latitude',  label: 'Center Latitude',     type: 'number', span: 1 },
    { key: 'longitude', label: 'Center Longitude',    type: 'number', span: 1 },
    { key: 'seatRows',  label: 'Seat Rows',           type: 'number', span: 1 },
    { key: 'seatCols',  label: 'Seat Columns',        type: 'number', span: 1 },
    { key: 'bssidWhitelist', label: 'Wi-Fi BSSID Whitelist (comma-separated)', type: 'text', span: 2 },
    { key: 'cameraUrl', label: 'Camera Stream URL (RTSP)', type: 'text', span: 2 }
  ];

  return (
    <div className="slide-up">
      {/* Header */}
      <div className="glass" style={{ padding: '20px 24px', marginBottom: 18 }}>
        <div className="section-title">
          <Shield size={20} color="var(--indigo)" />
          Admin Control Center
        </div>
        <div className="section-sub">Manage classrooms, geofence zones, seat layouts and system configuration.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, alignItems: 'start' }}>
        {/* Classroom Builder */}
        <div className="glass" style={{ padding: 24 }}>
          <div className="section-header" style={{ marginBottom: 20 }}>
            <div className="section-title" style={{ fontSize: '1rem' }}>
              <Plus size={17} color="var(--cyan)" />
              Classroom &amp; Geofence Builder
            </div>
          </div>

          {msg && (
            <div className={`alert alert-${msg.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: 14 }}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {fields.map(f => (
              <div
                key={f.key}
                className="input-group"
                style={{ gridColumn: f.span === 2 ? '1 / -1' : 'span 1' }}
              >
                <label className="input-label">{f.label}</label>
                <input
                  type={f.type}
                  className="input"
                  value={form[f.key]}
                  onChange={update(f.key)}
                  step={f.type === 'number' ? '0.0001' : undefined}
                />
              </div>
            ))}

            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="btn btn-primary btn-full">
                <MapPin size={16} /> Create Classroom Geofence Zone
              </button>
            </div>
          </form>
        </div>

        {/* Info Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Privacy Policy */}
          <div className="glass" style={{ padding: 22 }}>
            <div className="section-title" style={{ fontSize: '0.95rem', marginBottom: 14 }}>
              <Lock size={16} color="var(--violet)" />
              Privacy &amp; Data Policy
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: '🛡️', title: 'Zero Continuous Video Upload', desc: 'Camera feeds stay on lab PCs. Only compact JSON metadata reaches the server.' },
                { icon: '🔐', title: 'Biometric Isolation', desc: 'Face embeddings encrypted at rest. Inaccessible to student accounts.' },
                { icon: '🗄️', title: 'DB Abstraction Layer', desc: 'SQLite for prototype. DAO pattern enables PostgreSQL swap without code changes.' },
                { icon: '📋', title: 'Configurable Retention', desc: 'Attendance records, anomaly logs, and snapshots subject to configurable TTL.' }
              ].map(item => (
                <div key={item.title} className="glass-card" style={{ gap: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#fff', marginBottom: 3 }}>
                    {item.icon} {item.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--txt-muted)', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* DB Layer Info */}
          <div className="glass" style={{ padding: 20 }}>
            <div className="section-title" style={{ fontSize: '0.95rem', marginBottom: 12 }}>
              <Database size={16} color="var(--cyan)" />
              Architecture Notes
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--txt-secondary)', lineHeight: 1.65 }}>
              <div className="glass-inset" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', lineHeight: 1.8 }}>
                SQLite (prototype)<br />
                ↓ DatabaseAdapter DAO<br />
                ↓ PostgreSQL (production)<br />
                <br />
                Classroom Camera → Lab PC Worker<br />
                → OpenCV Head Count<br />
                → Metadata Only → API<br />
                → Anomaly Engine → Teacher
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
