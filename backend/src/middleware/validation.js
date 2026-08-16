/**
 * Input Validation Middleware
 * Provides schema validation for common request patterns
 */

const { AppError } = require('./errorHandler');

/**
 * Validate required fields in request body
 * @param {Array} fields - Array of required field names
 */
function validateRequired(fields) {
  return (req, res, next) => {
    const missing = fields.filter(field => !req.body[field]);
    if (missing.length > 0) {
      return next(new AppError(`Missing required fields: ${missing.join(', ')}`, 400));
    }
    next();
  };
}

/**
 * Validate email format
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate numeric fields
 */
function validateNumeric(value, fieldName) {
  if (isNaN(value) || value === null || value === '') {
    throw new AppError(`${fieldName} must be a valid number`, 400);
  }
}

/**
 * Validate latitude/longitude coordinates
 */
function validateCoordinates(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new AppError('Latitude and longitude must be numbers', 400);
  }
  if (lat < -90 || lat > 90) {
    throw new AppError('Latitude must be between -90 and 90', 400);
  }
  if (lng < -180 || lng > 180) {
    throw new AppError('Longitude must be between -180 and 180', 400);
  }
}

/**
 * Validate seat row/col within bounds
 */
function validateSeatBounds(row, col, maxRows, maxCols) {
  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    throw new AppError('Seat row and col must be integers', 400);
  }
  if (row < 1 || row > maxRows || col < 1 || col > maxCols) {
    throw new AppError(`Seat must be within bounds (1-${maxRows}, 1-${maxCols})`, 400);
  }
}

/**
 * Validate role
 */
function validateRole(role) {
  const validRoles = ['student', 'teacher', 'admin', 'worker'];
  if (!validRoles.includes(role)) {
    throw new AppError(`Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
  }
}

/**
 * Validate string length
 */
function validateStringLength(value, fieldName, min = 1, max = 255) {
  if (typeof value !== 'string' || value.length < min || value.length > max) {
    throw new AppError(`${fieldName} must be between ${min} and ${max} characters`, 400);
  }
}

/**
 * Middleware for validating login request
 */
function validateLoginRequest(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Email and password are required', 400));
  }

  if (!validateEmail(email)) {
    return next(new AppError('Invalid email format', 400));
  }

  if (password.length < 6) {
    return next(new AppError('Password must be at least 6 characters', 400));
  }

  next();
}

/**
 * Middleware for validating classroom creation
 */
function validateClassroomRequest(req, res, next) {
  const { name, code, latitude, longitude, radiusMeters, seatRows, seatCols } = req.body;

  try {
    if (!name || !code) {
      throw new AppError('Classroom name and code are required', 400);
    }

    validateStringLength(name, 'Classroom name', 2, 100);
    validateStringLength(code, 'Classroom code', 2, 20);
    validateCoordinates(latitude, longitude);

    if (radiusMeters && (radiusMeters < 5 || radiusMeters > 500)) {
      throw new AppError('Radius must be between 5 and 500 meters', 400);
    }

    if (seatRows && (seatRows < 1 || seatRows > 20)) {
      throw new AppError('Seat rows must be between 1 and 20', 400);
    }

    if (seatCols && (seatCols < 1 || seatCols > 20)) {
      throw new AppError('Seat cols must be between 1 and 20', 400);
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware for validating attendance marking
 */
function validateAttendanceRequest(req, res, next) {
  const { sessionId, lat, lng, accuracy, seatRow, seatCol } = req.body;

  try {
    if (!sessionId) {
      throw new AppError('Session ID is required', 400);
    }

    if (lat === undefined || lng === undefined) {
      throw new AppError('Latitude and longitude are required', 400);
    }

    validateCoordinates(lat, lng);

    if (!Number.isInteger(seatRow) || !Number.isInteger(seatCol)) {
      throw new AppError('Seat row and col must be integers', 400);
    }

    if (seatRow < 1 || seatCol < 1) {
      throw new AppError('Seat row and col must be positive', 400);
    }

    if (accuracy && (accuracy < 0 || accuracy > 1000)) {
      throw new AppError('Accuracy must be between 0 and 1000 meters', 400);
    }

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  validateRequired,
  validateEmail,
  validateNumeric,
  validateCoordinates,
  validateSeatBounds,
  validateRole,
  validateStringLength,
  validateLoginRequest,
  validateClassroomRequest,
  validateAttendanceRequest
};
