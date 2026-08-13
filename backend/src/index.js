const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');

const authMiddleware = require('./middleware/authMiddleware');
const authController = require('./controllers/authController');
const classroomController = require('./controllers/classroomController');
const attendanceController = require('./controllers/attendanceController');
const anomalyController = require('./controllers/anomalyController');
const workerController = require('./controllers/workerController');
const faceRecController = require('./controllers/faceRecController');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Auth Routes
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', authMiddleware.authenticateToken, authController.getMe);

// Classroom Routes
app.get('/api/classrooms', authMiddleware.authenticateToken, classroomController.getAllClassrooms);
app.get('/api/classrooms/:id', authMiddleware.authenticateToken, classroomController.getClassroomById);
app.post('/api/classrooms', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('admin'), classroomController.createClassroom);
app.put('/api/classrooms/:id/geofence', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('admin', 'teacher'), classroomController.updateClassroomGeofence);

// Attendance & Geofence Routes
app.get('/api/attendance/session/active', authMiddleware.authenticateToken, attendanceController.getActiveSession);
app.post('/api/attendance/session/start', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('teacher', 'admin'), attendanceController.startSession);
app.post('/api/attendance/session/end/:sessionId', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('teacher', 'admin'), attendanceController.endSession);
app.post('/api/attendance/mark', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('student'), attendanceController.verifyLocationAndMarkAttendance);
app.get('/api/attendance/grid/:sessionId', authMiddleware.authenticateToken, attendanceController.getSeatGridStatus);

// Anomaly Routes
app.get('/api/anomalies', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('teacher', 'admin'), anomalyController.getAnomalies);
app.put('/api/anomalies/:id/status', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('teacher', 'admin'), anomalyController.updateAnomalyStatus);

// Distributed Worker Node Routes
app.post('/api/worker/heartbeat', workerController.heartbeat);
app.post('/api/worker/report-count', workerController.reportPresenceCount);
app.get('/api/worker/list', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('admin', 'teacher'), workerController.getAllWorkers);

// Staff Mode Face Verification Route
app.post('/api/facerec/verify', authMiddleware.authenticateToken, authMiddleware.authorizeRoles('teacher', 'admin'), faceRecController.verifyClassroomPhoto);

// Create HTTP and WebSocket Server
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('📡 WebSocket client connected');
  ws.send(JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() }));
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

server.listen(PORT, () => {
  console.log(`🚀 Geo-Attendance Backend Server running on http://localhost:${PORT}`);
});
