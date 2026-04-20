import { verifyToken } from '../utils/jwt.js';
import { AppError } from '../utils/errors.js';
import User from '../models/User.js';
import { COOKIE_NAME } from '../utils/constants.js';

export const protect = async (req, res, next) => {
  try {
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null;
    const token = req.cookies[COOKIE_NAME] || bearer;

    console.log('🔐 [protect] Token check:');
    console.log('  - Bearer token:', bearer ? '✓ Found' : '✗ Not found');
    console.log('  - Cookie token:', req.cookies[COOKIE_NAME] ? '✓ Found' : '✗ Not found');
    console.log('  - Using token:', token ? '✓ Yes' : '✗ No');

    if (!token) {
      console.warn('⚠️ [protect] No token provided');
      return next(new AppError('Authentication required', 401));
    }

    const payload = verifyToken(token);
    console.log('🔓 [protect] Token verified:', { userId: payload.userId });

    const user = await User.findById(payload.userId).select('-passwordHash');
    
    if (!user) {
      console.warn('⚠️ [protect] User not found for token, clearing cookie:', payload.userId);
      res.clearCookie(COOKIE_NAME);
      return next(new AppError('Authentication required', 401));
    }
    
    console.log('✅ [protect] User authenticated:', { id: user._id, name: user.name, role: user.role });
    
    if (user.status === 'blocked') {
      console.error('❌ [protect] User account blocked:', user._id);
      return next(new AppError('Your account is blocked', 403));
    }

    req.user = user;
    next();
  } catch (error) {
    console.warn('⚠️ [protect] Authentication error, clearing cookie:', error.message);
    res.clearCookie(COOKIE_NAME);
    next(new AppError('Invalid or expired token', 401));
  }
};

export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('Forbidden', 403));
  }
  next();
};
