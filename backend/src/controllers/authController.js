const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/env');

/**
 * POST /api/auth/login
 * Receives { email, password }, verifies password, signs JWT, returns { token, user: { id, email, role, name } }
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      !email ||
      !password ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password.trim()
    ) {
      return res
        .status(400)
        .json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userId = user.id || user._id.toString();
    const payload = {
      id: userId,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    return res.status(200).json({
      token,
      user: {
        id: userId,
        email: user.email,
        role: user.role,
        name: user.name,
        department: user.department,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    return res
      .status(500)
      .json({ error: 'Internal server error during authentication' });
  }
};

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile
 */
const getMe = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user: user.toJSON() });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/auth/users
 * Retrieves list of all users
 */
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash');
    return res.status(200).json(users.map((u) => u.toJSON()));
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/auth/users/:id
 * Retrieves single user by id
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json(user.toJSON());
  } catch (error) {
    console.error('Error fetching user by id:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  login,
  getMe,
  getUsers,
  getUserById,
};
