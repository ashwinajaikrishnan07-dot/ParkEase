const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { generateToken } = require('../utils/jwt');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

function authPayload(user) {
  return {
    token: generateToken(user._id),
    user: user.toJSON(),
  };
}

// Lets the frontend know whether to render the "Continue with Google" button.
async function getAuthConfig(_request, response) {
  response.status(200).json({
    success: true,
    message: 'Auth configuration',
    data: { googleEnabled: Boolean(googleClient), googleClientId: GOOGLE_CLIENT_ID || null },
  });
}

// Verifies a Google Identity Services ID token, then provisions or retrieves
// the matching account. Identity is keyed on the Google `sub`, not email.
async function googleSignIn(request, response) {
  if (!googleClient) {
    throw new AppError('Google sign-in is not configured on this server', 503);
  }
  const credential = typeof request.body.credential === 'string' ? request.body.credential : '';
  if (!credential) throw new AppError('Missing Google credential', 400, { credential: 'Required' });

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    throw new AppError('Could not verify the Google credential', 401);
  }

  const sub = payload?.sub;
  const email = (payload?.email || '').toLowerCase();
  const emailVerified = payload?.email_verified === true || payload?.email_verified === 'true';
  const name = payload?.name || email.split('@')[0] || 'ParkEase user';
  const avatar = payload?.picture || '';
  if (!sub || !email) throw new AppError('Google credential did not include the required profile fields', 401);

  // 1) Already linked by Google subject id.
  let user = await User.findOne({ googleId: sub });

  // 2) Existing account with the same email — link only when Google verified it.
  if (!user) {
    const byEmail = await User.findOne({ email });
    if (byEmail) {
      if (!emailVerified) {
        throw new AppError('An account with this email already exists. Sign in with your password to link Google.', 409);
      }
      byEmail.googleId = sub;
      if (!byEmail.avatar && avatar) byEmail.avatar = avatar;
      await byEmail.save();
      user = byEmail;
    }
  }

  // 3) Brand new account provisioned from the Google profile.
  if (!user) {
    user = await User.create({ name, email, googleId: sub, avatar, authProvider: 'google', role: 'user' });
  }

  response.status(200).json({ success: true, message: 'Signed in with Google', data: authPayload(user) });
}

async function register(request, response) {
  const existingUser = await User.exists({ email: request.body.email });

  if (existingUser) {
    throw new AppError('An account with this email already exists', 409);
  }

  const user = await User.create(request.body);

  response.status(201).json({
    success: true,
    message: 'Registration successful',
    data: authPayload(user),
  });
}

async function login(request, response) {
  const user = await User.findOne({ email: request.body.email }).select('+password');
  const passwordMatches = user && (await user.comparePassword(request.body.password));

  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401);
  }

  response.status(200).json({
    success: true,
    message: 'Login successful',
    data: authPayload(user),
  });
}

async function getCurrentUser(request, response) {
  response.status(200).json({
    success: true,
    message: 'Current user retrieved',
    data: { user: request.user.toJSON() },
  });
}

module.exports = { getAuthConfig, getCurrentUser, googleSignIn, login, register };
