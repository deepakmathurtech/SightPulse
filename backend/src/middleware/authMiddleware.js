const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');

// Load JWT_SECRET from environment, with secure fallback for dev only
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn('⚠️  Using default JWT_SECRET. Set JWT_SECRET in .env for production');
  return 'dev-key-change-in-production-2026';
})();

const JWT_EXPIRY = process.env.JWT_EXPIRY || '12h';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(new AppError('Access token required', 401));
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return next(new AppError('Invalid or expired token', 403));
    }
    req.user = user;
    next();
  });
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new AppError('Permission denied for this action', 403));
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
  JWT_SECRET,
  JWT_EXPIRY
};
