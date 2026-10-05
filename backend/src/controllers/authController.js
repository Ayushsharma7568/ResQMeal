import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User from '../models/User.js';

/**
 * Generate a signed JWT for a given user ID.
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

/**
 * Helper: send token response with user data.
 */
const sendTokenResponse = (user, statusCode, res, message) => {
  const token = generateToken(user._id);

  res.status(statusCode).json({
    status: 'success',
    message,
    data: {
      user,
      token
    }
  });
};

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }

    const { email, password, name, phone, role } = req.body;

    // Prevent self-registration as ADMIN
    if (role === 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        message: 'Admin accounts cannot be created through registration'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'An account with this email already exists'
      });
    }

    // Create user (password hashing is handled by the pre-save hook)
    const user = await User.create({
      email,
      password,
      name,
      phone,
      role
    });

    sendTokenResponse(user, 201, res, 'Registration successful');
  } catch (error) {
    console.error('Registration error:', error);

    // Handle Mongoose duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'An account with this email already exists'
      });
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'An error occurred during registration'
    });
  }
};

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }

    const { email, password } = req.body;

    // Find user and explicitly select the password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'Your account has been deactivated — please contact support'
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    sendTokenResponse(user, 200, res, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred during login'
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/auth/me   (protected)
// ─────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    // req.user is set by the protect middleware
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching user profile'
    });
  }
};
