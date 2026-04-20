import cron from 'node-cron';
import Auction from '../models/Auction.js';
import { logAction } from '../utils/auditLogger.js';

export const calculateAuctionStatus = (auction, now = new Date()) => {
  if (now < auction.startTime) return 'Upcoming';
  if (now >= auction.startTime && now < auction.endTime) return 'Live';
  return 'Ended';
};

export const runAuctionLifecycle = async (io) => {
  const now = new Date();

  const liveResult = await Auction.updateMany(
    {
      status: 'Upcoming',
      startTime: { $lte: now },
      endTime: { $gt: now },
      deletedAt: null
    },
    { $set: { status: 'Live' } }
  );

  const endedAuctions = await Auction.find({
    status: { $in: ['Upcoming', 'Live'] },
    endTime: { $lte: now },
    deletedAt: null
  });

  for (const auction of endedAuctions) {
    auction.status = 'Ended';
    if (auction.currentHighestBidderId) {
      auction.winnerId = auction.currentHighestBidderId;
      auction.winnerBidAmount = auction.currentHighestBid;
    }
    await auction.save();

    await logAction({
      userId: null,
      action: 'AUCTION_ENDED',
      entityType: 'Auction',
      entityId: auction._id,
      metadata: { winnerId: auction.winnerId, winnerBidAmount: auction.winnerBidAmount }
    });

    if (io) {
      io.to(`auction:${auction._id}`).emit('auctionEnded', {
        auctionId: auction._id,
        winnerId: auction.winnerId,
        winnerBidAmount: auction.winnerBidAmount
      });
    }
  }

  if (liveResult.modifiedCount > 0 && io) {
    io.emit('auctionUpdated', { message: `${liveResult.modifiedCount} auction(s) are now live` });
  }
};

export const scheduleAuctionLifecycle = (io) => {
  cron.schedule('*/15 * * * * *', async () => {
    try {
      await runAuctionLifecycle(io);
    } catch (error) {
      console.error('Lifecycle job failed:', error.message);
    }
  });
};