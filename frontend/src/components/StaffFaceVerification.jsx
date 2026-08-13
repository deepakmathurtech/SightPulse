import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Sparkles, AlertCircle, UserCheck, User } from 'lucide-react';

export default function StaffFaceVerification({ sessionId }) {
  const [selectedImage, setSelectedImage]   = useState(null);
  const [loading, setLoading]               = useState(false);
  const [results, setResults]               = useState(null);
  const [hoveredFace, setHoveredFace]       = useState(null);

  const loadSamplePhoto = () => {
    // SVG classroom photo with colour blobs representing people
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="380" viewBox="0 0 640 380">
      <rect width="640" height="380" fill="#0d1625"/>
      <!-- Rows of desks -->
      <rect x="0" y="340" width="640" height="40" fill="#141f35"/>
      <rect x="40" y="290" width="560" height="50" fill="#1a2744" rx="4"/>
      <rect x="40" y="230" width="560" height="50" fill="#1a2744" rx="4"/>
      <rect x="40" y="170" width="560" height="50" fill="#1a2744" rx="4"/>
      <!-- Heads / faces -->
      <circle cx="110" cy="260" r="28" fill="#3b82f6" opacity="0.85"/>
      <circle cx="200" cy="260" r="26" fill="#6366f1" opacity="0.85"/>
      <circle cx="290" cy="260" r="27" fill="#10b981" opacity="0.85"/>
      <circle cx="380" cy="260" r="29" fill="#8b5cf6" opacity="0.85"/>
      <circle cx="470" cy="260" r="26" fill="#f59e0b" opacity="0.85"/>
      <circle cx="150" cy="200" r="27" fill="#06b6d4" opacity="0.85"/>
      <circle cx="240" cy="200" r="28" fill="#ec4899" opacity="0.85"/>
      <circle cx="340" cy="200" r="26" fill="#3b82f6" opacity="0.85"/>
      <!-- Unknown person at back -->
      <circle cx="540" cy="145" r="25" fill="#64748b" opacity="0.7"/>
      <!-- Camera info bar -->
      <rect x="0" y="0" width="640" height="26" fill="#060b14" opacity="0.9"/>
      <text x="12" y="17" fill="#6366f1" font-size="10" font-family="monospace" font-weight="bold">SIGHTPULSE-CAM</text>
      <text x="160" y="17" fill="#94a3b8" font-size="10" font-family="monospace">CSE-3B · LIVE · ${new Date().toLocaleTimeString()}</text>
    </svg>`;
    setSelectedImage(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
    setResults(null);
  };

  const handleFileUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setSelectedImage(reader.result); setResults(null); };
    reader.readAsDataURL(file);
  };

  const runVerification = async () => {
    if (!selectedImage) return;
    setLoading(true);
    try {
      const res = await fetch('/api/facerec/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sih_token')}`
        },
        body: JSON.stringify({ sessionId: sessionId || 'ses-cse3b-active', imageBase64: selectedImage })
      });
      const data = await res.json();
      setResults(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const IMG_W = 640;
  const IMG_H = 380;

  return (
    <div className="slide-up">
      {/* Header */}
      <div className="glass" style={{ padding: '20px 24px', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div className="section-title" style={{ marginBottom: 4 }}>
              <Camera size={20} color="var(--violet)" />
              Staff Mode · Classroom Face Audit
            </div>
            <p className="section-sub">Optional verification: capture a class photo and run OpenCV face detection to cross-reference with enrolled students.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn btn-ghost btn-sm" onClick={loadSamplePhoto}>
              <Sparkles size={13} /> Load Sample
            </button>
            <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
              <Upload size={13} /> Upload Photo
              <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      </div>

      {!selectedImage ? (
        <div className="glass">
          <div className="empty-state">
            <div className="empty-icon">
              <Camera size={28} color="var(--txt-muted)" />
            </div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.1rem', fontWeight: 700 }}>No Classroom Photo Loaded</div>
            <div className="section-sub">Click "Load Sample" to try a demo classroom frame, or upload a real photo.</div>
            <button className="btn btn-primary" onClick={loadSamplePhoto}>
              <Sparkles size={15} /> Load Demo Classroom Photo
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Photo + Bounding Boxes */}
          <div className="glass" style={{ padding: 24, marginBottom: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div className="facial-canvas-wrapper" style={{ position: 'relative', maxWidth: '100%' }}>
                <img
                  src={selectedImage}
                  alt="Classroom frame"
                  style={{ display: 'block', maxWidth: '100%', borderRadius: 12 }}
                />
                {results?.detections?.map(det => {
                  const scaleX = 100 / IMG_W;
                  const scaleY = 100 / IMG_H;
                  return (
                    <div
                      key={det.id}
                      className={`face-bbox ${!det.matchedUser ? 'unidentified' : ''}`}
                      style={{
                        left: `${det.box.x * scaleX}%`,
                        top: `${det.box.y * scaleY}%`,
                        width: `${det.box.width * scaleX}%`,
                        height: `${det.box.height * scaleY}%`,
                        cursor: 'pointer'
                      }}
                      onMouseEnter={() => setHoveredFace(det.id)}
                      onMouseLeave={() => setHoveredFace(null)}
                    >
                      <div className="face-tag" style={{ color: det.matchedUser ? '#34d399' : '#f87171' }}>
                        {det.matchedUser
                          ? `✓ ${det.matchedUser.name.split(' ')[0]} (${Math.round(det.confidence * 100)}%)`
                          : `⚠ Unknown (${Math.round(det.confidence * 100)}%)`}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                className="btn btn-primary"
                style={{ minWidth: 220 }}
                onClick={runVerification}
                disabled={loading}
              >
                <Sparkles size={16} />
                {loading ? 'Running OpenCV Analysis…' : 'Run Face Verification'}
              </button>
            </div>
          </div>

          {/* Results */}
          {results && (
            <div className="glass fade-in" style={{ padding: 22 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--txt-muted)', marginBottom: 14, fontFamily: 'var(--font-mono)' }}>
                ENGINE › {results.source}
              </div>
              <div className="stats-row" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 18 }}>
                <div className="stat-card">
                  <div className="stat-label">Total Faces</div>
                  <div className="stat-value">{results.totalFacesDetected}</div>
                  <div className="stat-sub">Detected in frame</div>
                </div>
                <div className="stat-card" style={{ borderLeft: '3px solid var(--emerald)' }}>
                  <div className="stat-label">Recognized</div>
                  <div className="stat-value" style={{ color: 'var(--emerald)' }}>{results.recognizedCount}</div>
                  <div className="stat-sub">Enrolled students</div>
                </div>
                <div className="stat-card" style={{ borderLeft: '3px solid var(--rose)' }}>
                  <div className="stat-label">Unidentified</div>
                  <div className="stat-value" style={{ color: 'var(--rose)' }}>{results.unidentifiedCount}</div>
                  <div className="stat-sub">Unknown persons</div>
                </div>
              </div>

              {/* Detection list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {results.detections?.map(det => (
                  <div
                    key={det.id}
                    className="glass-card"
                    style={{ display: 'flex', alignItems: 'center', gap: 14, background: hoveredFace === det.id ? 'rgba(26,39,68,0.9)' : undefined }}
                    onMouseEnter={() => setHoveredFace(det.id)}
                    onMouseLeave={() => setHoveredFace(null)}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: det.matchedUser ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)',
                      border: `1px solid ${det.matchedUser ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {det.matchedUser
                        ? <UserCheck size={16} color="var(--emerald)" />
                        : <User size={16} color="var(--rose)" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>
                        {det.matchedUser ? det.matchedUser.name : 'Unknown Person'}
                      </div>
                      {det.matchedUser?.seatLabel && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--txt-muted)' }}>Seat: {det.matchedUser.seatLabel}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${det.matchedUser ? 'badge-green' : 'badge-red'}`}>
                        {det.matchedUser ? 'Identified' : 'Unknown'}
                      </span>
                      <div style={{ fontSize: '0.72rem', color: 'var(--txt-muted)', marginTop: 3 }}>
                        Conf: {Math.round(det.confidence * 100)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
