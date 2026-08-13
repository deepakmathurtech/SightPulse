const workerManager = require('../services/workerManager');
const anomalyEngine = require('../services/anomalyEngine');
const db = require('../db/dbAdapter');

exports.heartbeat = (req, res) => {
  try {
    const { workerId, hostname, ipAddress, status, cpuUsage, ramUsage, activeJobs } = req.body;
    if (!workerId || !hostname) {
      return res.status(400).json({ error: 'Worker ID and Hostname required' });
    }

    const updatedWorker = workerManager.processHeartbeat({
      workerId,
      hostname,
      ipAddress: ipAddress || req.ip,
      status: status || 'ONLINE',
      cpuUsage: cpuUsage || 0,
      ramUsage: ramUsage || 0,
      activeJobs: activeJobs || 0
    });

    // Check if worker has assigned classrooms/streams to process
    const assignedClassrooms = db.query(
      `SELECT c.id, c.code, c.assigned_camera_url, s.id as active_session_id
       FROM classrooms c
       LEFT JOIN attendance_sessions s ON c.id = s.classroom_id AND s.status = 'ACTIVE'
       WHERE c.assigned_worker_id = ?`,
      [workerId]
    );

    res.json({
      status: 'ACK',
      worker: updatedWorker,
      assignedJobs: assignedClassrooms
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.reportPresenceCount = (req, res) => {
  try {
    const reports = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];

    for (const report of reports) {
      const { workerId, classroomId, sessionId, detectedCount } = report;

      let targetSessionId = sessionId;
      if (!targetSessionId && classroomId) {
        const activeSession = db.queryOne(
          `SELECT id FROM attendance_sessions WHERE classroom_id = ? AND status = 'ACTIVE' LIMIT 1`,
          [classroomId]
        );
        if (activeSession) {
          targetSessionId = activeSession.id;
        }
      }

      if (targetSessionId && detectedCount !== undefined) {
        const anomalyResult = anomalyEngine.processWorkerReport({
          sessionId: targetSessionId,
          classroomId,
          workerId: workerId || 'unknown-worker',
          detectedCount: parseInt(detectedCount, 10)
        });
        results.push(anomalyResult);
      }
    }

    res.json({
      message: 'Metadata report processed successfully',
      processedCount: results.length,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllWorkers = (req, res) => {
  try {
    const workers = workerManager.getAllWorkers();
    res.json({ workers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
