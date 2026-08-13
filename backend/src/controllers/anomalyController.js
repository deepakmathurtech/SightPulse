const db = require('../db/dbAdapter');

exports.getAnomalies = (req, res) => {
  try {
    const { status, sessionId } = req.query;
    let sql = `
      SELECT a.*, c.name as classroom_name, c.code as classroom_code, s.subject_name
      FROM anomaly_logs a
      JOIN classrooms c ON a.classroom_id = c.id
      JOIN attendance_sessions s ON a.session_id = s.id
    `;
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push('a.status = ?');
      params.push(status);
    }
    if (sessionId) {
      conditions.push('a.session_id = ?');
      params.push(sessionId);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY a.created_at DESC';

    const anomalies = db.query(sql, params);
    res.json({ anomalies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateAnomalyStatus = (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'RESOLVED' or 'DISMISSED'

    if (!['RESOLVED', 'DISMISSED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be RESOLVED or DISMISSED' });
    }

    db.execute('UPDATE anomaly_logs SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: `Anomaly updated to ${status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
