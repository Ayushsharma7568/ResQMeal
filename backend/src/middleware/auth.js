import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Authentication middleware — verifies JWT from Authorization header.
 * Attaches the decoded user to `req.user`.
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Extract token from "Bearer <token>" header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized — no token provided'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          message: 'Token has expired — please log in again'
        });
      }
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized — invalid token'
      });
    }

    // Fetch user and confirm they still exist / are active
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User belonging to this token no longer exists'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'Your account has been deactivated'
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during authentication'
    });
  }
};

/**
 * Role-based authorization middleware.
 * Usage: authorize('ADMIN', 'FOOD_PROVIDER')
 * Must be used AFTER the `protect` middleware.
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized — please log in first'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Role '${req.user.role}' is not authorized to access this resource. Required: ${roles.join(', ')}`
      });
    }

    next();
  };
};
