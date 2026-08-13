import React from 'react';
import { Activity, AlertTriangle, ShieldCheck, CheckCircle2, XCircle, Camera } from 'lucide-react';

const SEVERITY_CONFIG = {
  GREEN:  { cls: 'anomaly-green',  icon: <ShieldCheck size={16} />,  label: 'All Clear — Classroom verified' },
  YELLOW: { cls: 'anomaly-yellow', icon: <AlertTriangle size={16} />, label: 'Temporary Discrepancy — Monitoring' },
  RED:    { cls: 'anomaly-red',    icon: <AlertTriangle size={16} />, label: 'Persistent Anomaly — Teacher Review Required' },
};

export default function AnomalyAlerts({ anomalyState, onResolveAnomaly }) {
  const { expectedCount = 0, detectedCount = null, severity = 'GREEN', consecutiveDiscrepancies = 0, openAnomaly } = anomalyState || {};
  const { cls, icon, label } = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.GREEN;

  return (
    <div className="glass fade-in" style={{ padding: 22, marginBottom: 18 }}>
      <div className="section-header" style={{ marginBottom: 16 }}>
        <div className="section-title" style={{ fontSize: '1rem' }}>
          <Activity size={18} color="var(--cyan)" />
          AI Camera Security Engine
        </div>
        <div className={`anomaly-state-strip ${cls}`} style={{ padding: '8px 14px' }}>
          {icon}
          {label}
        </div>
      </div>

      {/* Counts Row */}
      <div className="stats-row" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: openAnomaly ? 16 : 0 }}>
        <div className="stat-card">
          <div className="stat-label">Logged Attendance</div>
          <div className="stat-value">{expectedCount}</div>
          <div className="stat-sub">Seat records in DB</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <Camera size={11} style={{ display: 'inline', marginRight: 4 }} />
            Camera Detected
          </div>
          <div className="stat-value" style={{ color: detectedCount !== null && detectedCount !== expectedCount ? 'var(--amber)' : 'inherit' }}>
            {detectedCount !== null ? detectedCount : '—'}
          </div>
          <div className="stat-sub">Physical head count</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Discrepancy Streak</div>
          <div className="stat-value" style={{ color: severity === 'RED' ? 'var(--rose)' : severity === 'YELLOW' ? 'var(--amber)' : 'var(--emerald)' }}>
            {consecutiveDiscrepancies}
            <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--txt-muted)', marginLeft: 4 }}>/3</span>
          </div>
          <div className="stat-sub">Consecutive checks</div>
        </div>
      </div>

      {/* Confidence bar */}
      {consecutiveDiscrepancies > 0 && (
        <div className="progress-bar-wrap" style={{ marginBottom: openAnomaly ? 16 : 0 }}>
          <div className="progress-bar-row">
            <span>Anomaly Confidence</span>
            <span style={{ color: severity === 'RED' ? 'var(--rose)' : 'var(--amber)', fontWeight: 700 }}>
              {Math.round((consecutiveDiscrepancies / 3) * 100)}%
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{
                width: `${Math.min(100, Math.round((consecutiveDiscrepancies / 3) * 100))}%`,
                background: severity === 'RED' ? 'var(--danger)' : 'var(--amber)'
              }}
            />
          </div>
        </div>
      )}

      {/* Open Anomaly Alert */}
      {openAnomaly && (
        <div className="alert alert-error" style={{ borderRadius: 'var(--r-lg)', padding: '16px 18px', alignItems: 'flex-start' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Persistent Anomaly · Manual Review Required</div>
            <div style={{ fontSize: '0.82rem', opacity: 0.85, lineHeight: 1.5 }}>{openAnomaly.details}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: 6 }}>
              Students are NOT automatically penalized. Teacher verification required.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}
                onClick={() => onResolveAnomaly(openAnomaly.id, 'RESOLVED')}>
                <CheckCircle2 size={13} /> Mark Resolved
              </button>
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--txt-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}
                onClick={() => onResolveAnomaly(openAnomaly.id, 'DISMISSED')}>
                <XCircle size={13} /> Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
