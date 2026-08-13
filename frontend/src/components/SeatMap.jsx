import React from 'react';
import { UserCheck, Armchair } from 'lucide-react';

export default function SeatMap({
  rows = 5, cols = 6,
  occupiedSeats = [],
  selectedSeat,
  onSelectSeat,
  isStudentView = false,
  myStudentId
}) {
  const getOccupant = (r, c) =>
    occupiedSeats.find(s => s.seat_row === r && s.seat_col === c);

  return (
    <div className="seat-map-container">
      <div className="podium-bar">📺 Teacher Podium · Projector Screen</div>

      <div
        className="seat-grid"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(50px, 1fr))` }}
      >
        {Array.from({ length: rows }).map((_, ri) =>
          Array.from({ length: cols }).map((_, ci) => {
            const r = ri + 1;
            const c = ci + 1;
            const occ = getOccupant(r, c);
            const isMine   = occ && occ.student_id === myStudentId;
            const isSelect = selectedSeat?.row === r && selectedSeat?.col === c;

            const cls = [
              'seat-cell',
              isMine ? 'my-seat' : occ ? 'occupied' : isSelect ? 'selected' : ''
            ].filter(Boolean).join(' ');

            return (
              <div
                key={`${r}-${c}`}
                className={cls}
                onClick={() => {
                  if (!occ && isStudentView && onSelectSeat)
                    onSelectSeat({ row: r, col: c, label: `Row ${r}, Seat ${c}` });
                }}
                title={occ
                  ? `Occupied · ${occ.student_name}`
                  : `Row ${r}, Seat ${c}`}
              >
                {occ ? (
                  <>
                    <UserCheck size={14} />
                    <span style={{ fontSize: '0.62rem', maxWidth: 46, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isMine ? 'YOU' : occ.student_name?.split(' ')[0]}
                    </span>
                  </>
                ) : (
                  <>
                    <Armchair size={14} style={{ opacity: isSelect ? 1 : 0.35 }} />
                    <span style={{ fontSize: '0.64rem' }}>R{r}C{c}</span>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="seat-legend">
        <div className="seat-legend-item">
          <div className="legend-dot" style={{ background: 'rgba(26,39,68,0.4)', border: '1px solid rgba(255,255,255,0.07)' }} />
          Available
        </div>
        <div className="seat-legend-item">
          <div className="legend-dot" style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)' }} />
          Occupied
        </div>
        {isStudentView && (
          <div className="seat-legend-item">
            <div className="legend-dot" style={{ background: 'var(--indigo)', border: '1px solid rgba(255,255,255,0.3)' }} />
            Selected
          </div>
        )}
        <div className="seat-legend-item">
          <div className="legend-dot" style={{ background: 'var(--emerald)', border: '1px solid rgba(255,255,255,0.3)' }} />
          You
        </div>
      </div>
    </div>
  );
}
