import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';
import { sendOTPEmail, sendDeletionRequestEmail } from '../utils/email.js';
import { deleteAudio } from '../config/storage.js';

// 20 login attempts per 15 min per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 10 OTP requests per 15 min per IP (covers send-verification, forgot-password)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const router = express.Router();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, country, profession, preferredLanguage } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.create({
      name,
      email,
      password,
      country: country || null,
      profession: profession || null,
      preferredLanguage: preferredLanguage || null,
      verificationOTP: hashedOTP,
      verificationOTPExpires: otpExpires,
    });

    try {
      await sendOTPEmail(email, otp, 'verify');
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr.message);
    }

    res.status(201).json({
      message: 'Account created. Please verify your email.',
      email: user.email,
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Email not verified', email: user.email });
    }

    user.lastLoginAt = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    const { token, expiresAt } = generateToken(user);
    res.json({
      message: 'Login successful',
      token,
      expiresAt,
      user: { id: user._id, name: user.name, email: user.email, role: user.role || 'user', plan: user.plan || 'free', planExpiresAt: user.planExpiresAt || null, planBillingCycle: user.planBillingCycle || null }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Send / Resend verification OTP
router.post('/send-verification', otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'No account found with this email' });
    if (user.isVerified) return res.status(400).json({ error: 'Email already verified' });

    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);

    user.verificationOTP = hashedOTP;
    user.verificationOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOTPEmail(email, otp, 'verify');
    res.json({ message: 'Verification code sent' });
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// Verify email with OTP
router.post('/verify-email', otpLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and code are required' });

    const user = await User.findOne({ email }).select('+verificationOTP');
    if (!user) return res.status(404).json({ error: 'No account found' });
    if (user.isVerified) return res.status(400).json({ error: 'Email already verified' });

    if (!user.verificationOTP || !user.verificationOTPExpires) {
      return res.status(400).json({ error: 'No verification code found. Request a new one.' });
    }
    if (user.verificationOTPExpires < new Date()) {
      return res.status(400).json({ error: 'Code expired. Request a new one.' });
    }

    const isMatch = await bcrypt.compare(otp, user.verificationOTP);
    if (!isMatch) return res.status(400).json({ error: 'Invalid code' });

    user.isVerified = true;
    user.verificationOTP = null;
    user.verificationOTPExpires = null;
    user.lastLoginAt = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    const { token, expiresAt } = generateToken(user);
    res.json({
      message: 'Email verified successfully',
      token,
      expiresAt,
      user: { id: user._id, name: user.name, email: user.email, role: user.role || 'user', plan: user.plan || 'free', planExpiresAt: user.planExpiresAt || null, planBillingCycle: user.planBillingCycle || null }
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Forgot password — send OTP
router.post('/forgot-password', otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user || !user.isVerified) {
      return res.json({ message: 'If that email exists, a reset code was sent' });
    }

    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);

    user.resetPasswordOTP = hashedOTP;
    user.resetPasswordOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOTPEmail(email, otp, 'reset');
    res.json({ message: 'If that email exists, a reset code was sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to send reset code' });
  }
});

// Reset password with OTP
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, code and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email }).select('+resetPasswordOTP +password');
    if (!user) return res.status(404).json({ error: 'No account found' });

    if (!user.resetPasswordOTP || !user.resetPasswordOTPExpires) {
      return res.status(400).json({ error: 'No reset code found. Request a new one.' });
    }
    if (user.resetPasswordOTPExpires < new Date()) {
      return res.status(400).json({ error: 'Code expired. Request a new one.' });
    }

    const isMatch = await bcrypt.compare(otp, user.resetPasswordOTP);
    if (!isMatch) return res.status(400).json({ error: 'Invalid code' });

    user.password = newPassword;
    user.resetPasswordOTP = null;
    user.resetPasswordOTPExpires = null;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Update profile
router.patch('/profile', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { name, avatar, country, profession, preferredLanguage, summaryLanguage, autoSave } = req.body;
    const updates = { name, avatar };
    if (country !== undefined) updates.country = country;
    if (profession !== undefined) updates.profession = profession;
    if (preferredLanguage !== undefined) updates.preferredLanguage = preferredLanguage;
    if (summaryLanguage !== undefined) updates.summaryLanguage = summaryLanguage;
    if (autoSave !== undefined) updates.autoSave = autoSave;
    const user = await User.findByIdAndUpdate(
      decoded.id,
      updates,
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Google Sign-In
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'ID token required' });

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
        password: googleId + process.env.JWT_SECRET,
        isVerified: true,
        lastLoginAt: new Date(),
        loginCount: 1,
      });
    } else {
      if (!user.googleId) user.googleId = googleId;
      if (!user.isVerified) user.isVerified = true;
      user.lastLoginAt = new Date();
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save();
    }

    const { token, expiresAt } = generateToken(user);
    res.json({
      token,
      expiresAt,
      user: { id: user._id, name: user.name, email: user.email, role: user.role || 'user', plan: user.plan || 'free', planExpiresAt: user.planExpiresAt || null, planBillingCycle: user.planBillingCycle || null },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ error: error.message || 'Google authentication failed' });
  }
});

// Refresh token — issues a fresh 7-day token (sliding session)
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    const { token, expiresAt } = generateToken(user);
    res.json({ token, expiresAt });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Delete account
router.post('/delete-account', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(404).json({ error: 'No account found with this email' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Incorrect password' });

    const Recording = (await import('../models/Recording.js')).default;

    // Delete audio files from R2 before removing DB records
    if (process.env.R2_ACCESS_KEY_ID) {
      const recordings = await Recording.find({ user: user._id }).select('audioKey').lean();
      await Promise.allSettled(recordings.filter(r => r.audioKey).map(r => deleteAudio(r.audioKey)));
    }

    await Recording.deleteMany({ user: user._id });
    await User.findByIdAndDelete(user._id);

    res.json({ message: 'Account and all associated data deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Public account deletion REQUEST (no login required — sends email to support)
router.post('/request-deletion', async (req, res) => {
  try {
    const { name, email, reason, additionalInfo } = req.body;
    if (!name || !email || !reason) {
      return res.status(400).json({ error: 'Name, email and reason are required' });
    }
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    await sendDeletionRequestEmail({ name, email, reason, additionalInfo: additionalInfo || '' });
    res.json({ message: 'Deletion request submitted successfully' });
  } catch (error) {
    console.error('Deletion request error:', error);
    res.status(500).json({ error: 'Failed to send deletion request. Please email us directly.' });
  }
});

// Accept privacy policy — saves consent to DB
router.post('/accept-privacy', authenticateToken, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      privacyAccepted: true,
      privacyAcceptedAt: new Date(),
    });
    res.json({ ok: true });
  } catch (error) {
    console.error('Accept privacy error:', error);
    res.status(500).json({ error: 'Failed to save consent' });
  }
});

export default router;
