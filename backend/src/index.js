const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');

const authMiddleware = require('./middleware/authMiddleware');
const { errorHandler, catchAsync } = require('./middleware/errorHandler');
const { validateLoginRequest, validateClassroomRequest, validateAttendanceRequest } = require('./middleware/validation');

const authController = require('./controllers/authController');
const classroomController = require('./controllers/classroomController');
const attendanceController = require('./controllers/attendanceController');
const anomalyController = require('./controllers/anomalyController');
const workerController = require('./controllers/workerController');
const faceRecController = require('./controllers/faceRecController');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration - restrict to allowed origins
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3002').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin.trim())) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '10mb' }));

// Auth Routes
app.post('/api/auth/login', validateLoginRequest, catchAsync(authController.login));
app.get('/api/auth/me', authMiddleware.authenticateToken, catchAsync(authController.getMe));

// Classroom Routes
app.get('/api/classrooms', authMiddleware.authenticateToken, catchAsync(classroomController.getAllClassrooms));
app.get('/api/classrooms/:id', authMiddleware.authenticateToken, catchAsync(classroomController.getClassroomById));
app.post('/api/classrooms', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('admin'), validateClassroomRequest, catchAsync(classroomController.createClassroom));
app.put('/api/classrooms/:id/geofence', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('admin', 'teacher'), validateClassroomRequest, catchAsync(classroomController.updateClassroomGeofence));

// Attendance & Geofence Routes
app.get('/api/attendance/session/active', authMiddleware.authenticateToken, catchAsync(attendanceController.getActiveSession));
app.post('/api/attendance/session/start', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('teacher', 'admin'), catchAsync(attendanceController.startSession));
app.post('/api/attendance/session/end/:sessionId', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('teacher', 'admin'), catchAsync(attendanceController.endSession));
app.post('/api/attendance/mark', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('student'), validateAttendanceRequest, catchAsync(attendanceController.verifyLocationAndMarkAttendance));
app.get('/api/attendance/grid/:sessionId', authMiddleware.authenticateToken, catchAsync(attendanceController.getSeatGridStatus));

// Anomaly Routes
app.get('/api/anomalies', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('teacher', 'admin'), catchAsync(anomalyController.getAnomalies));
app.put('/api/anomalies/:id/status', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('teacher', 'admin'), catchAsync(anomalyController.updateAnomalyStatus));

// Distributed Worker Node Routes
app.post('/api/worker/heartbeat', catchAsync(workerController.heartbeat));
app.post('/api/worker/report-count', catchAsync(workerController.reportPresenceCount));
app.get('/api/worker/list', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('admin', 'teacher'), catchAsync(workerController.getAllWorkers));

// Staff Mode Face Verification Route
app.post('/api/facerec/verify', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('teacher', 'admin'), catchAsync(faceRecController.verifyClassroomPhoto));

// Create HTTP and WebSocket Server
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('📡 WebSocket client connected');
  ws.send(JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() }));

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
  });

  ws.on('close', () => {
    console.log('📴 WebSocket client disconnected');
  });
});

// Broadcast periodic updates to active client dashboards
setInterval(() => {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(JSON.stringify({ type: 'HEARTBEAT', timestamp: new Date().toISOString() }));
    }
  });
}, 10000);

// Seed DB on start if empty
require('./seed')();

// ERROR HANDLER MIDDLEWARE (MUST BE LAST)
app.use((err, req, res, next) => {
  errorHandler(err, req, res, next);
});

server.listen(PORT, () => {
  console.log(`🚀 Geo-Attendance Backend Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready at ws://localhost:${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`⚠️  Running in ${process.env.NODE_ENV || 'development'} mode`);
  }
});

