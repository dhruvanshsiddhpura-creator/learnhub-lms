import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as GitHubStrategy } from 'passport-github2';
import dotenv from 'dotenv';

dotenv.config();

// Helper to configure Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'mock_google_id_123',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock_google_secret_123',
    callbackURL: 'http://localhost:5000/api/auth/google/callback',
    passReqToCallback: true,
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName || profile.username || 'Google User';
      const avatar = profile.photos?.[0]?.value || `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile.id}`;

      if (!email) {
        return done(new Error('No email found in your Google profile'), null);
      }

      return done(null, {
        provider: 'google',
        id: profile.id,
        name,
        email,
        avatar,
      });
    } catch (err) {
      return done(err, null);
    }
  }
));

// Helper to configure Facebook Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID || 'mock_facebook_id_123',
    clientSecret: process.env.FACEBOOK_APP_SECRET || 'mock_facebook_secret_123',
    callbackURL: 'http://localhost:5000/api/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'emails', 'photos'],
    passReqToCallback: true,
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value || `${profile.id}@facebook.local`;
      const name = profile.displayName || 'Facebook User';
      const avatar = profile.photos?.[0]?.value || `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile.id}`;

      return done(null, {
        provider: 'facebook',
        id: profile.id,
        name,
        email,
        avatar,
      });
    } catch (err) {
      return done(err, null);
    }
  }
));

// Helper to configure GitHub Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID || 'mock_github_id_123',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || 'mock_github_secret_123',
    callbackURL: 'http://localhost:5000/api/auth/github/callback',
    passReqToCallback: true,
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value || profile._json?.email;
      const name = profile.displayName || profile.username || 'GitHub User';
      const avatar = profile.photos?.[0]?.value || profile._json?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile.id}`;

      const finalEmail = email || `${profile.username || profile.id}@github.local`;

      return done(null, {
        provider: 'github',
        id: profile.id,
        name,
        email: finalEmail,
        avatar,
      });
    } catch (err) {
      return done(err, null);
    }
  }
));

export default passport;
