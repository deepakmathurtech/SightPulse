import React, { useState, useEffect } from 'react';
import { Server, Cpu, MemoryStick, RefreshCw, Zap, WifiOff, Activity, ArrowRightLeft } from 'lucide-react';

export default function WorkerMonitor() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/worker/list', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sih_token')}` }
      });
      const data = await res.json();
      setWorkers(data.workers || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchWorkers();
    const iv = setInterval(fetchWorkers, 5000);
    return () => clearInterval(iv);
  }, []);

  const online  = workers.filter(w => w.status === 'ONLINE').length;
  const offline = workers.filter(w => w.status === 'OFFLINE').length;
  const totalJobs = workers.reduce((s, w) => s + (w.active_jobs || 0), 0);

  return (
    <div className="slide-up">
      {/* Header */}
      <div className="glass" style={{ padding: '20px 24px', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="section-title" style={{ marginBottom: 4 }}>
              <Cpu size={20} color="var(--cyan)" />
              Distributed Lab PC Worker Fleet
            </div>
            <p className="section-sub">Camera processing jobs distributed across available lab PCs with auto-failover and resource limits.</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={fetchWorkers} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-row" style={{ marginBottom: 18 }}>
        <div className="stat-card">
          <div className="stat-label">Online Workers</div>
          <div className="stat-value" style={{ color: 'var(--emerald)' }}>{online}</div>
          <div className="stat-sub">Ready to process</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Offline Nodes</div>
          <div className="stat-value" style={{ color: offline > 0 ? 'var(--rose)' : 'var(--txt-secondary)' }}>{offline}</div>
          <div className="stat-sub">Jobs redistributed</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Camera Jobs</div>
          <div className="stat-value" style={{ color: 'var(--indigo)' }}>{totalJobs}</div>
          <div className="stat-sub">Streams being processed</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Nodes</div>
          <div className="stat-value">{workers.length}</div>
          <div className="stat-sub">Registered lab PCs</div>
        </div>
      </div>

      {/* Worker Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {workers.map(w => {
          const isOnline  = w.status === 'ONLINE';
          const isBusy    = w.cpu_usage > 75;
          const colorBorder = isOnline ? (isBusy ? 'var(--amber)' : 'var(--emerald)') : 'var(--rose)';

          return (
            <div
              key={w.id}
              className="worker-card fade-in"
              style={{ borderLeftColor: colorBorder }}
            >
              {/* Node Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isOnline ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${isOnline ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.2)'}`
                  }}>
                    {isOnline ? <Server size={16} color="var(--emerald)" /> : <WifiOff size={16} color="var(--rose)" />}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>
                      {w.hostname}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--txt-muted)', fontFamily: 'var(--font-mono)' }}>{w.ip_address}</div>
                  </div>
                </div>
                <span className={`badge ${isOnline ? (isBusy ? 'badge-yellow' : 'badge-green') : 'badge-red'}`}>
                  {isOnline ? (isBusy ? 'BUSY' : 'ONLINE') : 'OFFLINE'}
                </span>
              </div>

              {/* Resource Meters */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* CPU */}
                <div className="progress-bar-wrap">
                  <div className="progress-bar-row">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Cpu size={11} /> CPU Usage
                    </span>
                    <span style={{ color: isBusy ? 'var(--rose)' : 'var(--emerald)', fontWeight: 700 }}>{w.cpu_usage}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${w.cpu_usage}%`,
                        background: w.cpu_usage > 80 ? 'var(--danger)' : w.cpu_usage > 60 ? 'var(--amber)' : 'var(--emerald)'
                      }}
                    />
                  </div>
                </div>

                {/* RAM */}
                <div className="progress-bar-wrap">
                  <div className="progress-bar-row">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Activity size={11} /> RAM Usage
                    </span>
                    <span style={{ fontWeight: 700 }}>{w.ram_usage}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${w.ram_usage}%`, background: 'var(--indigo)' }} />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: '0.74rem', color: 'var(--txt-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Zap size={11} />
                  Active Jobs: <strong style={{ color: '#fff', marginLeft: 3 }}>{w.active_jobs}</strong>
                </div>
                <div>
                  Heartbeat: <strong style={{ color: '#fff' }}>{new Date(w.last_heartbeat).toLocaleTimeString()}</strong>
                </div>
              </div>
            </div>
          );
        })}

        {workers.length === 0 && !loading && (
          <div className="glass" style={{ gridColumn: '1/-1' }}>
            <div className="empty-state">
              <div className="empty-icon"><Server size={24} color="var(--txt-muted)" /></div>
              <div style={{ fontWeight: 700 }}>No Worker Nodes Registered</div>
              <div className="section-sub">Start a Python CV worker on any lab PC to register it here.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
