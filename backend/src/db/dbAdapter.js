const path = require('path');
const fs = require('fs');

let dbInstance = null;

/**
 * Database Abstraction Layer (DAO / Repository Pattern)
 * Wraps SQLite for instant zero-config prototype, but follows standard SQL async/sync interfaces
 * so switching to PostgreSQL (pg Pool) is seamless without modifying application logic.
 */
class DatabaseAdapter {
  constructor() {
    const Database = require('better-sqlite3');
    const dbPath = path.join(__dirname, '../../attendance.db');
    this.db = new Database(dbPath);
    this.db.pragma('foreign_keys = ON');
    this.initSchema();
  }

  static getInstance() {
    if (!dbInstance) {
      dbInstance = new DatabaseAdapter();
    }
    return dbInstance;
  }

  initSchema() {
    this.db.exec(`
      -- Users table with Roles
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT CHECK(role IN ('student', 'teacher', 'admin', 'worker')) NOT NULL,
        device_fingerprint TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Classrooms & Geofence Config
      CREATE TABLE IF NOT EXISTS classrooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        radius_meters REAL DEFAULT 25.0,
        bssid_whitelist TEXT, -- JSON array of allowed Wi-Fi BSSIDs/Subnets
        seat_rows INTEGER DEFAULT 6,
        seat_cols INTEGER DEFAULT 8,
        seat_layout TEXT, -- JSON layout map
        assigned_camera_url TEXT,
        assigned_worker_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Active & Historical Attendance Sessions
      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id TEXT PRIMARY KEY,
        classroom_id TEXT NOT NULL,
        teacher_id TEXT NOT NULL,
        subject_name TEXT NOT NULL,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time DATETIME,
        status TEXT CHECK(status IN ('ACTIVE', 'ENDED')) DEFAULT 'ACTIVE',
        FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
      );

      -- Student Seat Attendance Records
      CREATE TABLE IF NOT EXISTS seat_attendance (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        seat_row INTEGER NOT NULL,
        seat_col INTEGER NOT NULL,
        seat_label TEXT NOT NULL,
        verified_lat REAL,
        verified_lng REAL,
        verified_bssid TEXT,
        verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT CHECK(status IN ('PRESENT', 'FLAGGED', 'EXCUSED')) DEFAULT 'PRESENT',
        FOREIGN KEY (session_id) REFERENCES attendance_sessions(id),
        FOREIGN KEY (student_id) REFERENCES users(id),
        UNIQUE(session_id, student_id),
        UNIQUE(session_id, seat_row, seat_col)
      );

      -- CV Camera Head Count Snapshots
      CREATE TABLE IF NOT EXISTS cv_presence_snapshots (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        classroom_id TEXT NOT NULL,
        worker_id TEXT NOT NULL,
        detected_count INTEGER NOT NULL,
        confidence_score REAL DEFAULT 0.95,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES attendance_sessions(id)
      );

      -- Anomaly Detection Engine Records (Confidence & Persistence)
      CREATE TABLE IF NOT EXISTS anomaly_logs (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        classroom_id TEXT NOT NULL,
        expected_count INTEGER NOT NULL,
        detected_count INTEGER NOT NULL,
        severity TEXT CHECK(severity IN ('YELLOW', 'RED')) NOT NULL,
        status TEXT CHECK(status IN ('OPEN', 'RESOLVED', 'DISMISSED')) DEFAULT 'OPEN',
        consecutive_discrepancies INTEGER DEFAULT 1,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES attendance_sessions(id)
      );

      -- Distributed Lab PC Workers
      CREATE TABLE IF NOT EXISTS worker_nodes (
        id TEXT PRIMARY KEY,
        hostname TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        status TEXT CHECK(status IN ('ONLINE', 'BUSY', 'OFFLINE')) DEFAULT 'OFFLINE',
        cpu_usage REAL DEFAULT 0,
        ram_usage REAL DEFAULT 0,
        active_jobs INTEGER DEFAULT 0,
        last_heartbeat DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Enrolled Student Biometrics (Staff Face Recognition Mode)
      CREATE TABLE IF NOT EXISTS face_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        embedding_data TEXT NOT NULL, -- JSON array of face embeddings / features
        photo_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);
  }

  // Abstraction Query Methods
  query(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  queryOne(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.get(...params);
  }

  execute(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.run(...params);
  }
}

module.exports = DatabaseAdapter.getInstance();
