import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import SeatMap from '../components/SeatMap';
import AnomalyAlerts from '../components/AnomalyAlerts';
import StaffFaceVerification from '../components/StaffFaceVerification';
import WorkerMonitor from '../components/WorkerMonitor';
import { Play, Square, Users, Video, BookOpen, ChevronDown } from 'lucide-react';

export default function TeacherDashboard({ activeTab }) {
  const { user } = useAuth();
  const [classrooms, setClassrooms]   = useState([]);
  const [selClassroom, setSelClassroom] = useState('');
  const [subject, setSubject]         = useState('Advanced Computer Architecture (CS-401)');
  const [activeSession, setActiveSession] = useState(null);
  const [gridData, setGridData]       = useState(null);
  const [loading, setLoading]         = useState(false);

  const hdrs = { 'Authorization': `Bearer ${localStorage.getItem('sih_token')}`, 'Content-Type': 'application/json' };

  const fetchClassrooms = async () => {
    const res  = await fetch('/api/classrooms', { headers: hdrs });
    const data = await res.json();
    setClassrooms(data.classrooms || []);
    if (data.classrooms?.length) setSelClassroom(data.classrooms[0].id);
  };

  const fetchSession = async () => {
    const res  = await fetch('/api/attendance/session/active', { headers: hdrs });
    const data = await res.json();
    setActiveSession(data.session || null);
    if (data.session) fetchGrid(data.session.id);
  };

  const fetchGrid = async id => {
    const res  = await fetch(`/api/attendance/grid/${id}`, { headers: hdrs });
    const data = await res.json();
    setGridData(data);
  };

  useEffect(() => {
    fetchClassrooms();
    fetchSession();
  }, []);

  useEffect(() => {
    if (!activeSession) return;
    const iv = setInterval(() => fetchGrid(activeSession.id), 5000);
    return () => clearInterval(iv);
  }, [activeSession?.id]);

  const startSession = async () => {
    if (!selClassroom || !subject) return;
    setLoading(true);
    try {
      await fetch('/api/attendance/session/start', {
        method: 'POST', headers: hdrs,
        body: JSON.stringify({ classroomId: selClassroom, subjectName: subject })
      });
      await fetchSession();
    } finally { setLoading(false); }
  };

  const endSession = async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      await fetch(`/api/attendance/session/end/${activeSession.id}`, { method: 'POST', headers: hdrs });
      setActiveSession(null); setGridData(null);
    } finally { setLoading(false); }
  };

  const resolveAnomaly = async (id, status) => {
    await fetch(`/api/anomalies/${id}/status`, {
      method: 'PUT', headers: hdrs,
      body: JSON.stringify({ status })
    });
    fetchSession();
  };

  if (activeTab === 'staff-face') return <StaffFaceVerification sessionId={activeSession?.id || 'ses-cse3b-active'} />;
  if (activeTab === 'workers')    return <WorkerMonitor />;

  return (
    <div className="slide-up">
      {/* Session Control Panel */}
      <div className="glass" style={{ padding: '20px 24px', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div className="section-title" style={{ marginBottom: 3 }}>
              <BookOpen size={18} color="var(--indigo)" />
              Attendance Control Console
            </div>
            <div className="section-sub">Manage the live session and monitor AI camera security.</div>
          </div>

          {!activeSession ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <select
                  className="input"
                  value={selClassroom}
                  onChange={e => setSelClassroom(e.target.value)}
                  style={{ paddingRight: 36, minWidth: 220 }}
                >
                  {classrooms.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--txt-muted)' }} />
              </div>
              <input
                className="input"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Subject name…"
                style={{ minWidth: 260 }}
              />
              <button className="btn btn-primary" onClick={startSession} disabled={loading}>
                <Play size={15} /> Start Session
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-red" style={{ marginBottom: 4, display: 'block' }}>● Live Session</span>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{activeSession.subject_name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--txt-muted)' }}>{activeSession.classroom_code}</div>
              </div>
              <button className="btn btn-danger" onClick={endSession} disabled={loading}>
                <Square size={15} /> End Session
              </button>
            </div>
          )}
        </div>
      </div>

      {activeSession ? (
        <>
          {/* Anomaly Engine */}
          <AnomalyAlerts
            anomalyState={gridData?.anomalyState || activeSession?.anomalyState}
            onResolveAnomaly={resolveAnomaly}
          />

          {/* Live Seat Map */}
          <div className="glass" style={{ padding: 24 }}>
            <div className="section-header">
              <div>
                <div className="section-title">
                  <Users size={18} color="var(--violet)" />
                  Live Classroom Seat Map
                </div>
                <div className="section-sub">Real-time seat occupancy — updated every 5 seconds passively.</div>
              </div>
              <span className="badge badge-indigo">
                {gridData?.attendanceCount || 0} present
              </span>
            </div>

            <SeatMap
              rows={activeSession.seat_rows || 5}
              cols={activeSession.seat_cols || 6}
              occupiedSeats={gridData?.seats || []}
              isStudentView={false}
            />
          </div>
        </>
      ) : (
        <div className="glass">
          <div className="empty-state">
            <div className="empty-icon"><Video size={26} color="var(--txt-muted)" /></div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.1rem', fontWeight: 700 }}>No Active Session</div>
            <div className="section-sub">Select a classroom above and start a session to begin location-based attendance tracking.</div>
          </div>
        </div>
      )}
    </div>
  );
}
