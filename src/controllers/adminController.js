import User from '../models/User.js';
import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import AuditLog from '../models/AuditLog.js';
import { asyncHandler, AppError } from '../utils/errors.js';
import { logAction } from '../utils/auditLogger.js';

export const getUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
  res.json({ success: true, data: users });
});

export const blockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  if (user.role === 'Admin') throw new AppError('Cannot block admin', 409);

  user.status = 'blocked';
  user.blockedAt = new Date();
  user.blockedBy = req.user._id;
  await user.save();

  await logAction({ userId: req.user._id, action: 'USER_BLOCKED', entityType: 'User', entityId: user._id });

  res.json({ success: true, message: 'User blocked' });
});

export const unblockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);

  user.status = 'active';
  user.blockedAt = null;
  user.blockedBy = null;
  await user.save();

  await logAction({ userId: req.user._id, action: 'USER_UNBLOCKED', entityType: 'User', entityId: user._id });

  res.json({ success: true, message: 'User unblocked' });
});

export const getAdminAuctions = asyncHandler(async (_req, res) => {
  const auctions = await Auction.find().populate('sellerId', 'name email').sort({ createdAt: -1 });
  res.json({ success: true, data: auctions });
});

export const adminDeleteAuction = asyncHandler(async (req, res) => {
  const auction = await Auction.findById(req.params.id);
  if (!auction) throw new AppError('Auction not found', 404);

  auction.deletedAt = new Date();
  auction.deletedBy = req.user._id;
  auction.isArchived = true;
  await auction.save();

  await logAction({ userId: req.user._id, action: 'ADMIN_ARCHIVED_AUCTION', entityType: 'Auction', entityId: auction._id });

  res.json({ success: true, message: 'Auction archived by admin' });
});

export const getAdminBids = asyncHandler(async (_req, res) => {
  const bids = await Bid.find()
    .populate('auctionId', 'title images status')
    .populate('bidderId', 'name email')
    .sort({ createdAt: -1 })
    .limit(1000);
  res.json({ success: true, data: bids });
});

export const getAdminStats = asyncHandler(async (_req, res) => {
  const [totalUsers, activeAuctions, completedAuctions, totalBids] = await Promise.all([
    User.countDocuments(),
    Auction.countDocuments({ status: 'Live', deletedAt: null }),
    Auction.countDocuments({ status: 'Ended', deletedAt: null }),
    Bid.countDocuments()
  ]);

  res.json({
    success: true,
    data: { totalUsers, activeAuctions, completedAuctions, totalBids }
  });
});

export const getAdminLogs = asyncHandler(async (_req, res) => {
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(500).populate('userId', 'name role');
  res.json({ success: true, data: logs });
});