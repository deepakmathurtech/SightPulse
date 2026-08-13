const db = require('./db/dbAdapter');
const bcrypt = require('bcryptjs');

function seedDatabase() {
  console.log('🌱 Seeding database...');

  const passwordHash = bcrypt.hashSync('password123', 10);

  // Clear existing tables
  db.execute('DELETE FROM seat_attendance');
  db.execute('DELETE FROM cv_presence_snapshots');
  db.execute('DELETE FROM anomaly_logs');
  db.execute('DELETE FROM attendance_sessions');
  db.execute('DELETE FROM face_profiles');
  db.execute('DELETE FROM classrooms');
  db.execute('DELETE FROM worker_nodes');
  db.execute('DELETE FROM users');

  // Seed Users
  const users = [
    { id: 'usr-admin', name: 'Dr. Sarah Connor (Admin)', email: 'admin@college.edu', role: 'admin' },
    { id: 'usr-teacher1', name: 'Prof. Alan Turing', email: 'turing@college.edu', role: 'teacher' },
    { id: 'usr-student1', name: 'Alex Johnson', email: 'alex@student.edu', role: 'student' },
    { id: 'usr-student2', name: 'Priya Sharma', email: 'priya@student.edu', role: 'student' },
    { id: 'usr-student3', name: 'Marcus Vance', email: 'marcus@student.edu', role: 'student' },
    { id: 'usr-student4', name: 'Chen Wei', email: 'chen@student.edu', role: 'student' },
    { id: 'usr-student5', name: 'Sofia Rodriguez', email: 'sofia@student.edu', role: 'student' },
    { id: 'usr-worker1', name: 'Lab-PC-104 Node', email: 'lab104@worker.internal', role: 'worker' }
  ];

  users.forEach(u => {
    db.execute(
      'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [u.id, u.name, u.email, passwordHash, u.role]
    );
  });

  // Seed Classrooms with Geofence & Seat maps
  // Default coordinates set to classroom center: 12.9716, 77.5946 (or configurable)
  const classrooms = [
    {
      id: 'cls-cse-3b',
      name: 'CSE Lecture Hall 3B',
      code: 'CSE-3B',
      latitude: 12.9716,
      longitude: 77.5946,
      radius_meters: 30.0,
      bssid_whitelist: JSON.stringify(['A4:3B:CC:12:45:90', '00:14:22:01:23:45', 'CAMPUS_WIFI_HALL_3B']),
      seat_rows: 5,
      seat_cols: 6,
      assigned_camera_url: 'rtsp://192.168.1.101/live/cse3b',
      assigned_worker_id: 'wrk-lab-104'
    },
    {
      id: 'cls-ece-1a',
      name: 'ECE Lab Complex 1A',
      code: 'ECE-1A',
      latitude: 12.9720,
      longitude: 77.5950,
      radius_meters: 25.0,
      bssid_whitelist: JSON.stringify(['ECE_LAB_5G', 'F0:99:B8:11:22:33']),
      seat_rows: 4,
      seat_cols: 5,
      assigned_camera_url: 'rtsp://192.168.1.102/live/ece1a',
      assigned_worker_id: 'wrk-lab-105'
    }
  ];

  classrooms.forEach(c => {
    db.execute(
      `INSERT INTO classrooms 
       (id, name, code, latitude, longitude, radius_meters, bssid_whitelist, seat_rows, seat_cols, assigned_camera_url, assigned_worker_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.name, c.code, c.latitude, c.longitude, c.radius_meters, c.bssid_whitelist, c.seat_rows, c.seat_cols, c.assigned_camera_url, c.assigned_worker_id]
    );
  });

  // Seed Distributed Lab PC Worker Nodes
  const workers = [
    { id: 'wrk-lab-104', hostname: 'LAB-PC-104', ip_address: '192.168.10.104', status: 'ONLINE', cpu_usage: 24.5, ram_usage: 42.1, active_jobs: 1 },
    { id: 'wrk-lab-105', hostname: 'LAB-PC-105', ip_address: '192.168.10.105', status: 'ONLINE', cpu_usage: 18.0, ram_usage: 35.8, active_jobs: 1 },
    { id: 'wrk-lab-201', hostname: 'LAB-PC-201', ip_address: '192.168.10.201', status: 'OFFLINE', cpu_usage: 0, ram_usage: 0, active_jobs: 0 }
  ];

  workers.forEach(w => {
    db.execute(
      'INSERT INTO worker_nodes (id, hostname, ip_address, status, cpu_usage, ram_usage, active_jobs) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [w.id, w.hostname, w.ip_address, w.status, w.cpu_usage, w.ram_usage, w.active_jobs]
    );
  });

  // Seed Active Session for CSE-3B
  const sessionId = 'ses-cse3b-active';
  db.execute(
    `INSERT INTO attendance_sessions (id, classroom_id, teacher_id, subject_name, status)
     VALUES (?, ?, ?, ?, ?)`,
    [sessionId, 'cls-cse-3b', 'usr-teacher1', 'Advanced Computer Architecture (CS-401)', 'ACTIVE']
  );

  // Seed initial seat attendance records for demo
  const initialAttendance = [
    { student_id: 'usr-student1', row: 1, col: 2, label: 'Row 1, Seat 2' },
    { student_id: 'usr-student2', row: 1, col: 3, label: 'Row 1, Seat 3' },
    { student_id: 'usr-student3', row: 2, col: 4, label: 'Row 2, Seat 4' }
  ];

  initialAttendance.forEach(att => {
    db.execute(
      `INSERT INTO seat_attendance (id, session_id, student_id, seat_row, seat_col, seat_label, verified_lat, verified_lng, verified_bssid, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`att-${att.student_id}`, sessionId, att.student_id, att.row, att.col, att.label, 12.9716, 77.5946, 'A4:3B:CC:12:45:90', 'PRESENT']
    );
  });

  console.log('✅ Database successfully seeded!');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
