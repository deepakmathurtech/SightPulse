const db = require('../db/dbAdapter');
const { validateStudentLocation } = require('../services/geofenceService');
const anomalyEngine = require('../services/anomalyEngine');
const { AppError } = require('../middleware/errorHandler');

exports.getActiveSession = (req, res) => {
  try {
    const { classroomId } = req.query;
    let sql = `
      SELECT s.*, c.name as classroom_name, c.code as classroom_code, c.latitude, c.longitude, c.radius_meters, c.seat_rows, c.seat_cols, u.name as teacher_name
      FROM attendance_sessions s
      JOIN classrooms c ON s.classroom_id = c.id
      JOIN users u ON s.teacher_id = u.id
      WHERE s.status = 'ACTIVE'
    `;
    const params = [];
    if (classroomId) {
      sql += ' AND s.classroom_id = ?';
      params.push(classroomId);
    }
    sql += ' ORDER BY s.start_time DESC LIMIT 1';

    const session = db.queryOne(sql, params);
    if (!session) {
      return res.json({ session: null });
    }

    const anomalyState = anomalyEngine.getSessionStatus(session.id);
    res.json({ session: { ...session, anomalyState } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.startSession = (req, res) => {
  try {
    const { classroomId, subjectName } = req.body;
    const teacherId = req.user.id;

    if (!classroomId || !subjectName) {
      return res.status(400).json({ error: 'Classroom ID and Subject Name are required' });
    }

    // End any existing active session for this classroom
    db.execute("UPDATE attendance_sessions SET status = 'ENDED', end_time = CURRENT_TIMESTAMP WHERE classroom_id = ? AND status = 'ACTIVE'", [classroomId]);

    const id = `ses-${Date.now()}`;
    db.execute(
      `INSERT INTO attendance_sessions (id, classroom_id, teacher_id, subject_name, status)
       VALUES (?, ?, ?, ?, 'ACTIVE')`,
      [id, classroomId, teacherId, subjectName]
    );

    res.status(201).json({ message: 'Attendance session started', sessionId: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.endSession = (req, res) => {
  try {
    const { sessionId } = req.params;
    db.execute("UPDATE attendance_sessions SET status = 'ENDED', end_time = CURRENT_TIMESTAMP WHERE id = ?", [sessionId]);
    res.json({ message: 'Session ended successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.verifyLocationAndMarkAttendance = (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { sessionId, lat, lng, accuracy, bssid, seatRow, seatCol, seatLabel } = req.body;

    const session = db.queryOne('SELECT * FROM attendance_sessions WHERE id = ? AND status = \'ACTIVE\'', [sessionId]);
    if (!session) {
      throw new AppError('Active session not found or class has ended', 400);
    }

    const classroom = db.queryOne('SELECT * FROM classrooms WHERE id = ?', [session.classroom_id]);
    if (!classroom) {
      throw new AppError('Classroom record not found', 404);
    }

    // Check if student already checked into this session
    const existingCheckin = db.queryOne('SELECT * FROM seat_attendance WHERE session_id = ? AND student_id = ?', [sessionId, studentId]);

    // Check if seat is already occupied by someone else
    const occupiedSeat = db.queryOne('SELECT * FROM seat_attendance WHERE session_id = ? AND seat_row = ? AND seat_col = ? AND student_id != ?', [sessionId, seatRow, seatCol, studentId]);
    if (occupiedSeat) {
      throw new AppError(`Seat (${seatLabel || 'R' + seatRow + 'C' + seatCol}) is already selected by another student.`, 409);
    }

    // Retrieve last attendance record for velocity spoof check
    const previousCheck = db.queryOne(
      'SELECT verified_lat, verified_lng, verified_at FROM seat_attendance WHERE student_id = ? ORDER BY verified_at DESC LIMIT 1',
      [studentId]
    );

    // Run Geofence & Anti-Spoofing Verification
    const locValidation = validateStudentLocation({
      studentLat: lat,
      studentLng: lng,
      accuracy,
      bssid,
      classroom,
      previousCheck
    });

    if (!locValidation.isValid) {
      throw new AppError('Geofence location verification failed', 400);
    }

    const attendanceId = existingCheckin ? existingCheckin.id : `att-${studentId}-${sessionId}`;
    const formattedLabel = seatLabel || `Row ${seatRow}, Seat ${seatCol}`;

    if (existingCheckin) {
      db.execute(
        `UPDATE seat_attendance 
         SET seat_row = ?, seat_col = ?, seat_label = ?, verified_lat = ?, verified_lng = ?, verified_bssid = ?, verified_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [seatRow, seatCol, formattedLabel, lat, lng, bssid || '', attendanceId]
      );
    } else {
      db.execute(
        `INSERT INTO seat_attendance 
         (id, session_id, student_id, seat_row, seat_col, seat_label, verified_lat, verified_lng, verified_bssid, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PRESENT')`,
        [attendanceId, sessionId, studentId, seatRow, seatCol, formattedLabel, lat, lng, bssid || '']
      );
    }

    res.json({
      message: 'Attendance successfully recorded!',
      attendance: {
        id: attendanceId,
        seatLabel: formattedLabel,
        verifiedAt: new Date().toISOString(),
        validationDetails: locValidation
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getSeatGridStatus = (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = db.queryOne('SELECT * FROM attendance_sessions WHERE id = ?', [sessionId]);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const classroom = db.queryOne('SELECT * FROM classrooms WHERE id = ?', [session.classroom_id]);
    const attendanceRecords = db.query(
      `SELECT a.*, u.name as student_name, u.email as student_email
       FROM seat_attendance a
       JOIN users u ON a.student_id = u.id
       WHERE a.session_id = ?`,
      [sessionId]
    );

    const anomalyState = anomalyEngine.getSessionStatus(sessionId);

    res.json({
      sessionId,
      classroom: {
        id: classroom.id,
        name: classroom.name,
        code: classroom.code,
        seatRows: classroom.seat_rows,
        seatCols: classroom.seat_cols
      },
      attendanceCount: attendanceRecords.length,
      seats: attendanceRecords,
      anomalyState
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
