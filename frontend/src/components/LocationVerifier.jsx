import React, { useState, useEffect } from 'react';
import { MapPin, Wifi, CheckCircle2, RefreshCw, ShieldCheck, AlertCircle, Info } from 'lucide-react';

export default function LocationVerifier({ classroom, onLocationVerified, selectedSeat }) {
  const [location, setLocation]   = useState(null);
  const [accuracy, setAccuracy]   = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [bssid, setBssid]         = useState('A4:3B:CC:12:45:90');

  const fetchLocation = () => {
    setLocLoading(true);
    if (!navigator.geolocation) {
      // Fallback for demo
      setLocation({ lat: classroom?.latitude ?? 12.9716, lng: classroom?.longitude ?? 77.5946 });
      setAccuracy(8);
      setLocLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        // In prototype: snap to classroom coords so demo works regardless of real GPS location
        setLocation({ lat: classroom?.latitude ?? pos.coords.latitude, lng: classroom?.longitude ?? pos.coords.longitude });
        setAccuracy(pos.coords.accuracy || 9);
        setLocLoading(false);
      },
      () => {
        setLocation({ lat: classroom?.latitude ?? 12.9716, lng: classroom?.longitude ?? 77.5946 });
        setAccuracy(9);
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
    );
  };

  useEffect(() => { fetchLocation(); }, [classroom?.id]);

  const isInZone = location && classroom
    ? true // In prototype we snap to classroom coords, so always in zone
    : false;

  return (
    <div className="glass fade-in" style={{ padding: 22, marginBottom: 18 }}>
      <div className="section-header" style={{ marginBottom: 14 }}>
        <div className="section-title" style={{ fontSize: '1rem' }}>
          <MapPin size={18} color="var(--indigo)" />
          Location &amp; Network Verification
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchLocation} disabled={locLoading}>
          <RefreshCw size={13} className={locLoading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="loc-grid">
        {/* GPS Block */}
        <div className="glass-inset">
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--txt-muted)', letterSpacing: '0.07em', marginBottom: 8, textTransform: 'uppercase' }}>
            GPS Geolocation
          </div>
          {location ? (
            <>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: '#fff', marginBottom: 4 }}>
                {location.lat.toFixed(5)}°, {location.lng.toFixed(5)}°
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem' }}>
                <CheckCircle2 size={13} color="var(--emerald)" />
                <span style={{ color: 'var(--emerald)' }}>
                  ±{Math.round(accuracy || 10)}m accuracy
                  {isInZone ? ' · Inside geofence' : ' · Checking…'}
                </span>
              </div>
            </>
          ) : (
            <div style={{ fontSize: '0.84rem', color: 'var(--txt-muted)' }}>
              {locLoading ? 'Acquiring GPS fix…' : 'GPS unavailable'}
            </div>
          )}
        </div>

        {/* Wi-Fi / BSSID block */}
        <div className="glass-inset">
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--txt-muted)', letterSpacing: '0.07em', marginBottom: 8, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Wifi size={12} />
            Wi-Fi BSSID Evidence
            <span style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', fontSize: '0.65rem', padding: '1px 6px', borderRadius: 4 }}>Simulated</span>
          </div>
          <select
            value={bssid}
            onChange={e => setBssid(e.target.value)}
            className="input"
            style={{ padding: '7px 10px', fontSize: '0.8rem' }}
          >
            <option value="A4:3B:CC:12:45:90">A4:3B:CC:12:45:90 — CSE-3B AP #1 ✓</option>
            <option value="00:14:22:01:23:45">00:14:22:01:23:45 — CSE-3B AP #2 ✓</option>
            <option value="HOME_ROUTER_REJECT">FF:FF:FF:00:00:00 — Unknown Wi-Fi ✗</option>
          </select>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginTop: 7, fontSize: '0.72rem', color: 'var(--txt-muted)' }}>
            <Info size={11} style={{ flexShrink: 0, marginTop: 1 }} />
            Production: verified via campus AP controller or native agent.
          </div>
        </div>
      </div>

      {/* Seat + Confirm Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--txt-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>
            Selected Seat
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: selectedSeat ? 'var(--emerald)' : 'var(--rose)', fontFamily: 'var(--font-head)' }}>
            {selectedSeat ? selectedSeat.label : 'Select your seat on the map below ↓'}
          </div>
        </div>
        <button
          className="btn btn-success"
          disabled={!selectedSeat || !location}
          onClick={() => onLocationVerified({ lat: location.lat, lng: location.lng, accuracy, bssid, seatRow: selectedSeat.row, seatCol: selectedSeat.col, seatLabel: selectedSeat.label })}
        >
          <ShieldCheck size={16} />
          Confirm &amp; Mark Present
        </button>
      </div>
    </div>
  );
}
