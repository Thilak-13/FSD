import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { config } from '../config/env';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// POST /login (or /api/auth/login)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
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

    const payload = {
      id: user.id || user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: (config.jwtExpiresIn || '8h') as any,
    });

    return res.status(200).json({
      token,
      user: {
        id: user.id || user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
});

// GET /me (or /api/auth/me)
router.get('/me', authenticateJWT, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user: user.toJSON() });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /users (or /api/auth/users)
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await User.find();
    return res.status(200).json(users.map((u) => u.toJSON()));
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /users/:id (or /api/auth/users/:id)
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json(user.toJSON());
  } catch (error) {
    console.error('Error fetching user by id:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export const authRouter = router;
export default router;
