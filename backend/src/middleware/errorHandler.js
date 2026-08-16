/**
 * Centralized Error Handling Middleware
 * Catches all synchronous and asynchronous errors in express routes
 */

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Express error handling middleware
 * Must be registered LAST, after all other middlewares and routes
 */
function errorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ Error:', {
      message: err.message,
      statusCode: err.statusCode,
      stack: err.stack,
      path: req.path,
      method: req.method
    });
  }

  // Mongoose validation error (if using MongoDB later)
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    return res.status(400).json({ error: message, type: 'VALIDATION_ERROR' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(403).json({ error: 'Invalid token', type: 'JWT_ERROR' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(403).json({ error: 'Token expired', type: 'TOKEN_EXPIRED' });
  }

  // SQLite constraint errors
  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(409).json({ 
      error: 'Duplicate entry or constraint violation', 
      type: 'CONSTRAINT_ERROR' 
    });
  }

  // Default error response
  res.status(err.statusCode).json({
    error: err.message,
    type: 'SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * Wrapper to catch async errors in route handlers
 * Usage: app.get('/route', catchAsync(async (req, res) => {...}))
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  errorHandler,
  catchAsync
};
