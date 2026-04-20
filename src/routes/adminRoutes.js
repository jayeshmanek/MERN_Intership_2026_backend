import { Router } from 'express';
import {
  adminDeleteAuction,
  blockUser,
  getAdminAuctions,
  getAdminBids,
  getAdminLogs,
  getAdminStats,
  getUsers,
  unblockUser
} from '../controllers/adminController.js';
import { authorize, protect } from '../middleware/auth.js';

const router = Router();

router.use(protect, authorize('Admin'));

router.get('/users', getUsers);
router.patch('/users/:id/block', blockUser);
router.patch('/users/:id/unblock', unblockUser);
router.get('/auctions', getAdminAuctions);
router.delete('/auctions/:id', adminDeleteAuction);
router.get('/bids', getAdminBids);
router.get('/stats', getAdminStats);
router.get('/logs', getAdminLogs);

export default router;