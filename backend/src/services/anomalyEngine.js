const db = require('../db/dbAdapter');

/**
 * Confidence & Persistence Anomaly Engine
 * Tracks camera presence count vs logged student seat attendance over time.
 * State progression: GREEN (Normal) -> YELLOW (Temporary Discrepancy) -> RED (Persistent Anomaly Alert)
 */
class AnomalyEngine {
  constructor() {
    // In-memory persistent tracking per session: { sessionId: { consecutiveDiscrepancies: N, lastSeverity: 'GREEN'|'YELLOW'|'RED' } }
    this.sessionStateMap = new Map();
  }

  processWorkerReport({ sessionId, classroomId, workerId, detectedCount }) {
    if (!sessionId) return { status: 'NO_ACTIVE_SESSION' };

    // 1. Get current logged seat attendance count for this session
    const attendanceRow = db.queryOne(
      `SELECT COUNT(*) as expected_count FROM seat_attendance WHERE session_id = ? AND status = 'PRESENT'`,
      [sessionId]
    );

    const expectedCount = attendanceRow ? attendanceRow.expected_count : 0;
    const countDifference = Math.abs(expectedCount - detectedCount);

    // Save camera snapshot entry
    const snapshotId = `snap-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    db.execute(
      `INSERT INTO cv_presence_snapshots (id, session_id, classroom_id, worker_id, detected_count)
       VALUES (?, ?, ?, ?, ?)`,
      [snapshotId, sessionId, classroomId, workerId, detectedCount]
    );

    // Retrieve state tracking
    let state = this.sessionStateMap.get(sessionId) || { consecutiveDiscrepancies: 0, lastSeverity: 'GREEN' };

    // Discrepancy tolerance threshold (allow 1 person tolerance for lighting/movement)
    const isDiscrepancy = countDifference > 1;

    if (isDiscrepancy) {
      state.consecutiveDiscrepancies += 1;
    } else {
      state.consecutiveDiscrepancies = 0; // Reset counter on valid match
    }

    let severity = 'GREEN';
    if (state.consecutiveDiscrepancies >= 3) {
      severity = 'RED'; // Persistent anomaly confirmed across 3+ consecutive checks
    } else if (state.consecutiveDiscrepancies >= 1) {
      severity = 'YELLOW'; // Temporary discrepancy
    }

    state.lastSeverity = severity;
    this.sessionStateMap.set(sessionId, state);

    // If RED, log or update persistent anomaly alert entry in database
    if (severity === 'RED') {
      const existingAnomaly = db.queryOne(
        `SELECT * FROM anomaly_logs WHERE session_id = ? AND status = 'OPEN'`,
        [sessionId]
      );

      const details = `Expected ${expectedCount} present students via seat map, but camera repeatedly detected ${detectedCount} physical persons (${state.consecutiveDiscrepancies} consecutive checks).`;

      if (existingAnomaly) {
        db.execute(
          `UPDATE anomaly_logs 
           SET detected_count = ?, expected_count = ?, consecutive_discrepancies = ?, details = ?
           WHERE id = ?`,
          [detectedCount, expectedCount, state.consecutiveDiscrepancies, details, existingAnomaly.id]
        );
      } else {
        const anomalyId = `anom-${Date.now()}`;
        db.execute(
          `INSERT INTO anomaly_logs 
           (id, session_id, classroom_id, expected_count, detected_count, severity, status, consecutive_discrepancies, details)
           VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)`,
          [anomalyId, sessionId, classroomId, expectedCount, detectedCount, 'RED', state.consecutiveDiscrepancies, details]
        );
      }
    } else if (severity === 'GREEN') {
      // Auto-resolve open anomalies when count returns to normal state
      db.execute(
        `UPDATE anomaly_logs SET status = 'RESOLVED' WHERE session_id = ? AND status = 'OPEN'`,
        [sessionId]
      );
    }

    return {
      sessionId,
      classroomId,
      expectedCount,
      detectedCount,
      countDifference,
      severity,
      consecutiveDiscrepancies: state.consecutiveDiscrepancies,
      timestamp: new Date().toISOString()
    };
  }

  getSessionStatus(sessionId) {
    const attendanceRow = db.queryOne(
      `SELECT COUNT(*) as expected_count FROM seat_attendance WHERE session_id = ? AND status = 'PRESENT'`,
      [sessionId]
    );
    const expectedCount = attendanceRow ? attendanceRow.expected_count : 0;

    const latestSnapshot = db.queryOne(
      `SELECT * FROM cv_presence_snapshots WHERE session_id = ? ORDER BY created_at DESC LIMIT 1`,
      [sessionId]
    );

    const state = this.sessionStateMap.get(sessionId) || { consecutiveDiscrepancies: 0, lastSeverity: 'GREEN' };
    const openAnomaly = db.queryOne(
      `SELECT * FROM anomaly_logs WHERE session_id = ? AND status = 'OPEN'`,
      [sessionId]
    );

    return {
      expectedCount,
      detectedCount: latestSnapshot ? latestSnapshot.detected_count : null,
      severity: state.lastSeverity,
      consecutiveDiscrepancies: state.consecutiveDiscrepancies,
      openAnomaly: openAnomaly || null,
      lastSnapshotTime: latestSnapshot ? latestSnapshot.created_at : null
    };
  }
}

module.exports = new AnomalyEngine();
