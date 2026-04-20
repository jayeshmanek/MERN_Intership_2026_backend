import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, me, register, updateProfile } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema, profileUpdateSchema, registerSchema } from '../validators/authValidator.js';

const router = Router();
const authWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Too many auth requests, try again later' }
});

router.post('/register', authWriteLimiter, validateBody(registerSchema), register);
router.post('/login', authWriteLimiter, validateBody(loginSchema), login);
router.post('/logout', protect, logout);
router.get('/me', protect, me);
router.patch('/profile', protect, validateBody(profileUpdateSchema), updateProfile);

export default router;