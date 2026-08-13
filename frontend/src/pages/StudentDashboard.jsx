import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import LocationVerifier from '../components/LocationVerifier';
import SeatMap from '../components/SeatMap';
import { CheckCircle2, AlertCircle, Clock, ShieldCheck, BookOpen, MapPin } from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [activeSession, setActiveSession]         = useState(null);
  const [gridData, setGridData]                   = useState(null);
  const [selectedSeat, setSelectedSeat]           = useState(null);
  const [attendanceSuccess, setAttendanceSuccess] = useState(null);
  const [loading, setLoading]                     = useState(true);
  const [error, setError]                         = useState('');

  const fetchActiveSession = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/attendance/session/active', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sih_token')}` }
      });
      const data = await res.json();
      setActiveSession(data.session);
      if (data.session) fetchGridStatus(data.session.id);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const fetchGridStatus = async id => {
    try {
      const res  = await fetch(`/api/attendance/grid/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sih_token')}` }
      });
      const data = await res.json();
      setGridData(data);
      const mine = data.seats?.find(s => s.student_id === user.id);
      if (mine) setAttendanceSuccess({ seatLabel: mine.seat_label, verifiedAt: mine.verified_at });
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchActiveSession();
    const iv = setInterval(() => {
      if (activeSession) fetchGridStatus(activeSession.id);
    }, 8000);
    return () => clearInterval(iv);
  }, [activeSession?.id]);

  const handleMarkAttendance = async payload => {
    setError('');
    try {
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sih_token')}`
        },
        body: JSON.stringify({ sessionId: activeSession.id, ...payload })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark attendance');
      setAttendanceSuccess(data.attendance);
      fetchGridStatus(activeSession.id);
    } catch (e) { setError(e.message); }
  };

  if (loading) {
    return (
      <div className="glass fade-in" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--txt-secondary)' }}>
          <span className="spin" style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--indigo)', borderRadius: '50%' }} />
          Loading session…
        </div>
      </div>
    );
  }

  if (!activeSession) {
    return (
      <div className="glass fade-in">
        <div className="empty-state">
          <div className="empty-icon"><Clock size={28} color="var(--txt-muted)" /></div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.15rem', fontWeight: 700 }}>No Active Class Session</div>
          <div className="section-sub">
            Your teacher hasn't started an attendance session yet.<br />
            Please wait and this page will update automatically.
          </div>
          <button className="btn btn-ghost btn-sm" onClick={fetchActiveSession}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="slide-up">
      {/* Session Banner */}
      <div className="session-banner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span className="badge badge-red" style={{ animation: 'badge-pulse 1.5s infinite' }}>● Live</span>
            <span className="badge badge-indigo">{activeSession.classroom_code}</span>
          </div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: 3 }}>
            {activeSession.subject_name}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--txt-secondary)' }}>
            <BookOpen size={13} style={{ display: 'inline', marginRight: 5 }} />
            {activeSession.classroom_name} · {activeSession.teacher_name}
          </div>
        </div>

        {attendanceSuccess && (
          <div style={{ padding: '14px 18px', borderRadius: 'var(--r-lg)', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--emerald)', fontWeight: 800, fontSize: '0.95rem', marginBottom: 3 }}>
              <ShieldCheck size={18} /> Attendance Recorded
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--txt-secondary)' }}>
              {attendanceSuccess.seatLabel} · {new Date(attendanceSuccess.verifiedAt).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Location verifier (hidden once attendance marked) */}
      {!attendanceSuccess && (
        <LocationVerifier
          classroom={activeSession}
          selectedSeat={selectedSeat}
          onLocationVerified={handleMarkAttendance}
        />
      )}

      {/* Seat Map */}
      <div className="glass" style={{ padding: 24 }}>
        <div className="section-header">
          <div>
            <div className="section-title">
              <MapPin size={18} color="var(--indigo)" />
              Classroom Seat Map
            </div>
            <div className="section-sub">
              {attendanceSuccess
                ? 'Your seat is highlighted in green. Attendance is now passive.'
                : 'Click an available seat to claim it, then confirm your location above.'}
            </div>
          </div>
          {gridData && (
            <span className="badge badge-indigo">
              {gridData.attendanceCount} / {activeSession.seat_rows * activeSession.seat_cols} occupied
            </span>
          )}
        </div>

        <SeatMap
          rows={activeSession.seat_rows || 5}
          cols={activeSession.seat_cols || 6}
          occupiedSeats={gridData?.seats || []}
          selectedSeat={selectedSeat}
          onSelectSeat={setSelectedSeat}
          isStudentView={!attendanceSuccess}
          myStudentId={user.id}
        />
      </div>
    </div>
  );
}
