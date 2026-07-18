import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db.js';

// Helpers to generate tokens
const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '15m', // Short-lived access token
  });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d', // Long-lived refresh token
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  const { name, email, password, role, avatar } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide name, email, and password' });
  }

  try {
    // Check if user already exists
    const userExists = await prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Set default avatar if not provided
    const userRole = role || 'STUDENT';
    const defaultAvatar = avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${name.replace(/\s+/g, '')}`;

    // Generate tokens
    const tempId = crypto.randomUUID ? crypto.randomUUID() : 'temp-id'; // placeholder until user created

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: userRole,
        avatar: defaultAvatar,
      },
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Save refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      token: accessToken,
      refreshToken,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Authenticate a user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Save refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      token: accessToken,
      refreshToken,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  res.json(req.user);
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
export const refresh = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Rotate tokens
    const newAccessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newRefreshToken },
    });

    res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

// @desc    OAuth Callback Handler (Login, Register & Connect Linking)
// @route   GET /api/auth/[provider]/callback
// @access  Public
export const handleOAuthCallback = async (req, res) => {
  const oAuthUser = req.user; // Set by passport
  const state = req.query.state;

  if (!oAuthUser) {
    return res.redirect('http://localhost:5173/login?error=oauth_failed');
  }

  try {
    let connectUserId = null;
    if (state) {
      try {
        const decoded = jwt.verify(state, process.env.JWT_SECRET);
        connectUserId = decoded.connectUserId;
      } catch (err) {
        // state parameter failed validation or expired
        console.warn('OAuth Connect state decoding failed:', err.message);
      }
    }

    if (connectUserId) {
      // CONNECTION FLOW: Map oauth provider to active user session
      let updateData = {};
      if (oAuthUser.provider === 'google') {
        updateData = { googleId: oAuthUser.id };
      } else if (oAuthUser.provider === 'facebook') {
        updateData = { facebookId: oAuthUser.id };
      } else if (oAuthUser.provider === 'github') {
        updateData = { githubId: oAuthUser.id };
      }

      await prisma.user.update({
        where: { id: connectUserId },
        data: updateData,
      });

      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?connect_status=success`);
    }

    // LOGIN/REGISTRATION FLOW
    // Look up by email for account linking / de-duplication
    let user = await prisma.user.findUnique({
      where: { email: oAuthUser.email },
    });

    let updateData = {};
    if (user) {
      // Account exists, link the provider if it's not already linked
      if (oAuthUser.provider === 'google' && !user.googleId) {
        updateData.googleId = oAuthUser.id;
      } else if (oAuthUser.provider === 'facebook' && !user.facebookId) {
        updateData.facebookId = oAuthUser.id;
      } else if (oAuthUser.provider === 'github' && !user.githubId) {
        updateData.githubId = oAuthUser.id;
      }

      // Sync avatar if missing
      if (!user.avatar) {
        updateData.avatar = oAuthUser.avatar;
      }

      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    } else {
      // Register a brand new user
      const creationData = {
        name: oAuthUser.name,
        email: oAuthUser.email,
        role: 'STUDENT',
        avatar: oAuthUser.avatar,
        password: null, // Nullable password for OAuth-only users
      };

      if (oAuthUser.provider === 'google') {
        creationData.googleId = oAuthUser.id;
      } else if (oAuthUser.provider === 'facebook') {
        creationData.facebookId = oAuthUser.id;
      } else if (oAuthUser.provider === 'github') {
        creationData.githubId = oAuthUser.id;
      }

      user = await prisma.user.create({
        data: creationData,
      });
    }

    // Generate JWT access & refresh tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Save refresh token to user
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    // Redirect user to the frontend login route which extracts the credentials
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?token=${accessToken}&refreshToken=${refreshToken}`);
  } catch (error) {
    console.error('OAuth Callback Controller Error:', error);
    
    // Check for Prisma unique constraint violation (account already linked to someone else)
    if (error.code === 'P2002') {
      const providerName = oAuthUser.provider.charAt(0).toUpperCase() + oAuthUser.provider.slice(1);
      if (connectUserId) {
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?connect_status=error&message=This ${providerName} profile is already linked to another account.`);
      } else {
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=This ${providerName} profile is already linked to another account.`);
      }
    }
    
    if (connectUserId) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard?connect_status=error&message=Server error linking account.`);
    }
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=OAuth authentication failed.`);
  }
};

// @desc    Disconnect provider linking
// @route   POST /api/auth/disconnect/:provider
// @access  Private
export const disconnectProvider = async (req, res) => {
  const { provider } = req.params;
  const userId = req.user.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if other credential options remain
    let otherMethodsCount = 0;
    if (user.password !== null) otherMethodsCount++;
    if (user.googleId !== null && provider !== 'google') otherMethodsCount++;
    if (user.facebookId !== null && provider !== 'facebook') otherMethodsCount++;
    if (user.githubId !== null && provider !== 'github') otherMethodsCount++;

    if (otherMethodsCount === 0) {
      return res.status(400).json({
        message: 'Cannot disconnect provider. You must keep at least one login method (password or social connection).',
      });
    }

    let updateData = {};
    if (provider === 'google') {
      updateData = { googleId: null };
    } else if (provider === 'facebook') {
      updateData = { facebookId: null };
    } else if (provider === 'github') {
      updateData = { githubId: null };
    } else {
      return res.status(400).json({ message: 'Invalid provider connection type' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    res.json({ message: `Successfully unlinked your ${provider} connection` });
  } catch (error) {
    console.error('Disconnect provider error:', error);
    res.status(500).json({ message: 'Server error unlinking provider' });
  }
};
