import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { asyncHandler, AppError } from '../utils/errors.js';
import { signToken } from '../utils/jwt.js';
import { COOKIE_NAME, cookieOptions } from '../utils/constants.js';
import { logAction } from '../utils/auditLogger.js';

const toSafeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  birthDate: user.birthDate || null,
  role: user.role,
  status: user.status,
  avatarUrl: user.avatarUrl,
  bio: user.bio,
  createdAt: user.createdAt
});

export const register = asyncHandler(async (req, res) => {
  console.log('📝 [register] Starting registration with body:', { name: req.body.name, email: req.body.email, role: req.body.role });
  const { name, email, password } = req.body;
  const birthDate = req.body.birthDate;
  const role = req.body.role || 'Bidder';

  // Validate required fields
  if (!name || !email || !password) {
    console.error('❌ [register] Missing required fields');
    throw new AppError('Name, email, and password are required', 400);
  }

  const exists = await User.findOne({ email });
  if (exists) {
    console.error('❌ [register] Email already registered:', email);
    throw new AppError('Email already registered', 409);
  }

  console.log('✅ [register] Email is unique, creating user');
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email,
    birthDate,
    passwordHash,
    role,
    status: 'active'
  });

  console.log('✅ [register] User created successfully:', { userId: user._id, email: user.email, role: user.role });

  await logAction({ userId: user._id, action: 'USER_REGISTERED', entityType: 'User', entityId: user._id });

  const safeUser = toSafeUser(user);
  console.log('📤 [register] Sending response with user:', { id: safeUser._id, email: safeUser.email });
  res.status(201).json({ success: true, user: safeUser, message: 'Registration successful' });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw new AppError('Invalid credentials', 401);
  if (user.status === 'blocked') throw new AppError('Your account is blocked', 403);

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError('Invalid credentials', 401);

  const token = signToken({ userId: user._id, role: user.role });
  res.cookie(COOKIE_NAME, token, cookieOptions);

  await logAction({ userId: user._id, action: 'USER_LOGIN', entityType: 'User', entityId: user._id });

  res.json({ success: true, token, user: toSafeUser(user) });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie(COOKIE_NAME);
  if (req.user) {
    await logAction({ userId: req.user._id, action: 'USER_LOGOUT', entityType: 'User', entityId: req.user._id });
  }
  res.json({ success: true, message: 'Logged out' });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: toSafeUser(req.user) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const updates = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true }).select('-passwordHash');

  await logAction({ userId: req.user._id, action: 'PROFILE_UPDATED', entityType: 'User', entityId: req.user._id });

  res.json({ success: true, user: toSafeUser(user) });
});