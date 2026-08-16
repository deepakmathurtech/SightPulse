const db = require('../db/dbAdapter');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRY } = require('../middleware/authMiddleware');
const { AppError } = require('../middleware/errorHandler');

exports.login = (req, res, next) => {
  try {
    const { email, password, deviceFingerprint } = req.body;

    const user = db.queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    // Update device fingerprint if provided
    if (deviceFingerprint) {
      db.execute('UPDATE users SET device_fingerprint = ? WHERE id = ?', [deviceFingerprint, user.id]);
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = (req, res, next) => {
  try {
    const user = db.queryOne('SELECT id, name, email, role, device_fingerprint, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    res.json({ user });
  } catch (error) {
    next(error);
  }
};
