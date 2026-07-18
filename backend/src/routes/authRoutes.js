import express from 'express';
import jwt from 'jsonwebtoken';
import passport from '../config/passport.js';
import {
  register,
  login,
  getMe,
  refresh,
  handleOAuthCallback,
  disconnectProvider,
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Standard local auth routes
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/refresh', refresh);

// Dynamic connect endpoint for linking social providers to active user sessions
router.get('/connect/:provider', protect, (req, res, next) => {
  const { provider } = req.params;

  // Sign state token with user's ID to verify on callback return
  const stateToken = jwt.sign({ connectUserId: req.user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });

  if (provider === 'google') {
    passport.authenticate('google', { scope: ['profile', 'email'], session: false, state: stateToken })(req, res, next);
  } else if (provider === 'facebook') {
    passport.authenticate('facebook', { scope: ['email'], session: false, state: stateToken })(req, res, next);
  } else if (provider === 'github') {
    passport.authenticate('github', { scope: ['user:email'], session: false, state: stateToken })(req, res, next);
  } else {
    res.status(400).json({ message: 'Invalid connection provider' });
  }
});

// Disconnect provider route
router.post('/disconnect/:provider', protect, disconnectProvider);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=Google authentication failed` }),
  handleOAuthCallback
);

// Facebook OAuth routes
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'], session: false }));
router.get(
  '/facebook/callback',
  (req, res, next) => {
    passport.authenticate('facebook', { session: false }, (err, user, info) => {
      if (err) {
        if (err.message && err.message.includes('authorization code has been used')) {
          return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=Browser sent duplicate request. Please try Facebook login again.`);
        }
        // Send the exact internal OAuth error to the browser so we can debug it
        console.error("FACEBOOK OAUTH ERROR:", err);
        return res.status(400).json({ 
          error: "Facebook Login Failed", 
          details: err.message || err.toString(),
          oauthError: err.oauthError || null
        });
      }
      if (!user) {
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=Facebook authentication failed`);
      }
      req.user = user;
      next();
    })(req, res, next);
  },
  handleOAuthCallback
);

// GitHub OAuth routes
router.get('/github', passport.authenticate('github', { scope: ['user:email'], session: false }));
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=GitHub authentication failed` }),
  handleOAuthCallback
);

export default router;
