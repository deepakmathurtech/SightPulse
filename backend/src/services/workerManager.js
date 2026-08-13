const db = require('../db/dbAdapter');

/**
 * Distributed Lab PC Worker Scheduler & Health Monitor
 * Manages worker node heartbeats, resource metrics, job allocation, and failover re-assignment.
 */
class WorkerManager {
  processHeartbeat({ workerId, hostname, ipAddress, status = 'ONLINE', cpuUsage = 0, ramUsage = 0, activeJobs = 0 }) {
    const existing = db.queryOne('SELECT * FROM worker_nodes WHERE id = ?', [workerId]);

    if (existing) {
      db.execute(
        `UPDATE worker_nodes 
         SET hostname = ?, ip_address = ?, status = ?, cpu_usage = ?, ram_usage = ?, active_jobs = ?, last_heartbeat = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [hostname, ipAddress, status, cpuUsage, ramUsage, activeJobs, workerId]
      );
    } else {
      db.execute(
        `INSERT INTO worker_nodes (id, hostname, ip_address, status, cpu_usage, ram_usage, active_jobs, last_heartbeat)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [workerId, hostname, ipAddress, status, cpuUsage, ramUsage, activeJobs]
      );
    }

    // Check for high resource usage (e.g. CPU > 85%) -> Trigger automatic job migration if needed
    if (cpuUsage > 85.0 && activeJobs > 0) {
      this.reallocateWorkerJobs(workerId);
    }

    return this.getWorkerStatus(workerId);
  }

  reallocateWorkerJobs(overloadedWorkerId) {
    console.log(`⚠️ Worker ${overloadedWorkerId} CPU/RAM overloaded. Reallocating camera processing jobs...`);
    
    // Find assigned classrooms
    const affectedClassrooms = db.query('SELECT * FROM classrooms WHERE assigned_worker_id = ?', [overloadedWorkerId]);
    if (affectedClassrooms.length === 0) return;

    // Find available worker with lowest CPU load & online status
    const candidate = db.queryOne(
      `SELECT * FROM worker_nodes 
       WHERE status = 'ONLINE' AND id != ? AND cpu_usage < 70.0 
       ORDER BY cpu_usage ASC LIMIT 1`,
      [overloadedWorkerId]
    );

    if (candidate) {
      affectedClassrooms.forEach(cls => {
        db.execute('UPDATE classrooms SET assigned_worker_id = ? WHERE id = ?', [candidate.id, cls.id]);
        console.log(`🔀 Migrated classroom ${cls.code} camera job from ${overloadedWorkerId} -> ${candidate.id}`);
      });
      // Decrement job count on overloaded worker and increment on candidate
      db.execute('UPDATE worker_nodes SET active_jobs = MAX(0, active_jobs - 1) WHERE id = ?', [overloadedWorkerId]);
      db.execute('UPDATE worker_nodes SET active_jobs = active_jobs + 1 WHERE id = ?', [candidate.id]);
    }
  }

  checkStaleWorkers() {
    // Mark workers offline if heartbeat missing > 20 seconds
    const offlineWorkers = db.query(
      `SELECT * FROM worker_nodes WHERE status != 'OFFLINE' AND (strftime('%s', 'now') - strftime('%s', last_heartbeat)) > 20`
    );

    offlineWorkers.forEach(w => {
      db.execute("UPDATE worker_nodes SET status = 'OFFLINE', active_jobs = 0 WHERE id = ?", [w.id]);
      this.reallocateWorkerJobs(w.id);
    });
  }

  getWorkerStatus(workerId) {
    return db.queryOne('SELECT * FROM worker_nodes WHERE id = ?', [workerId]);
  }

  getAllWorkers() {
    this.checkStaleWorkers();
    return db.query('SELECT * FROM worker_nodes ORDER BY last_heartbeat DESC');
  }
}

module.exports = new WorkerManager();
