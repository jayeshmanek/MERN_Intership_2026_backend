import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import { AppError } from '../utils/errors.js';
import { logAction } from '../utils/auditLogger.js';

export const placeBidAtomic = async ({ auctionId, bidder, bidAmount }) => {
  const now = new Date();
  let auction = await Auction.findById(auctionId);
  if (!auction || auction.deletedAt) throw new AppError('Auction not found', 404);

  if (auction.sellerId.toString() === bidder._id.toString()) {
    throw new AppError('Seller cannot bid on own auction', 403);
  }

  const tries = 4;
  for (let i = 0; i < tries; i += 1) {
    if (auction.status !== 'Live' || auction.startTime > now || auction.endTime <= now) {
      throw new AppError('Auction is not live', 409);
    }

    const minimum = Math.max(auction.basePrice, auction.currentHighestBid || 0);
    if (bidAmount <= minimum) {
      throw new AppError(`Bid must be greater than ${minimum}`, 409);
    }

    const updated = await Auction.findOneAndUpdate(
      {
        _id: auction._id,
        status: 'Live',
        endTime: { $gt: now },
        currentHighestBid: auction.currentHighestBid
      },
      {
        $set: {
          currentHighestBid: bidAmount,
          currentHighestBidderId: bidder._id
        }
      },
      { new: true }
    ).populate('currentHighestBidderId', 'name');

    if (updated) {
      const bid = await Bid.create({
        auctionId: auction._id,
        bidderId: bidder._id,
        bidAmount,
        timestamp: new Date()
      });

      await logAction({
        userId: bidder._id,
        action: 'BID_PLACED',
        entityType: 'Auction',
        entityId: auction._id,
        metadata: { bidAmount }
      });

      return { auction: updated, bid };
    }

    auction = await Auction.findById(auctionId);
    if (!auction) throw new AppError('Auction not found', 404);
  }

  throw new AppError('Bid conflict, please retry', 409);
};