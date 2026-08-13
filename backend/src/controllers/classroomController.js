const db = require('../db/dbAdapter');

exports.getAllClassrooms = (req, res) => {
  try {
    const classrooms = db.query(`
      SELECT c.*, w.hostname as assigned_worker_name, w.status as worker_status
      FROM classrooms c
      LEFT JOIN worker_nodes w ON c.assigned_worker_id = w.id
    `);
    
    // Parse JSON fields safely
    const formatted = classrooms.map(c => ({
      ...c,
      bssid_whitelist: c.bssid_whitelist ? JSON.parse(c.bssid_whitelist) : []
    }));

    res.json({ classrooms: formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getClassroomById = (req, res) => {
  try {
    const classroom = db.queryOne('SELECT * FROM classrooms WHERE id = ?', [req.params.id]);
    if (!classroom) {
      return res.status(404).json({ error: 'Classroom not found' });
    }
    classroom.bssid_whitelist = classroom.bssid_whitelist ? JSON.parse(classroom.bssid_whitelist) : [];
    res.json({ classroom });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createClassroom = (req, res) => {
  try {
    const { name, code, latitude, longitude, radiusMeters, bssidWhitelist, seatRows, seatCols, cameraUrl, assignedWorkerId } = req.body;
    
    if (!name || !code || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Name, code, latitude, and longitude are required' });
    }

    const id = `cls-${Date.now()}`;
    const bssidJson = JSON.stringify(bssidWhitelist || []);

    db.execute(
      `INSERT INTO classrooms 
       (id, name, code, latitude, longitude, radius_meters, bssid_whitelist, seat_rows, seat_cols, assigned_camera_url, assigned_worker_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, code, latitude, longitude, radiusMeters || 25.0, bssidJson, seatRows || 6, seatCols || 8, cameraUrl || '', assignedWorkerId || '']
    );

    res.status(201).json({ message: 'Classroom created successfully', id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateClassroomGeofence = (req, res) => {
  try {
    const { latitude, longitude, radiusMeters, bssidWhitelist } = req.body;
    const classroomId = req.params.id;

    const classroom = db.queryOne('SELECT * FROM classrooms WHERE id = ?', [classroomId]);
    if (!classroom) {
      return res.status(404).json({ error: 'Classroom not found' });
    }

    const bssidJson = JSON.stringify(bssidWhitelist || []);

    db.execute(
      `UPDATE classrooms 
       SET latitude = ?, longitude = ?, radius_meters = ?, bssid_whitelist = ?
       WHERE id = ?`,
      [latitude, longitude, radiusMeters, bssidJson, classroomId]
    );

    res.json({ message: 'Geofence updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
