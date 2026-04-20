import Bid from '../models/Bid.js';
import Auction from '../models/Auction.js';
import { asyncHandler } from '../utils/errors.js';
import { placeBidAtomic } from '../services/bidService.js';
import { AppError } from '../utils/errors.js';

export const placeBid = (io) => asyncHandler(async (req, res) => {
  const { auctionId, bidAmount } = req.body;
  const result = await placeBidAtomic({ auctionId, bidAmount, bidder: req.user });

  io.to(`auction:${auctionId}`).emit('bidAccepted', {
    auctionId,
    currentHighestBid: result.auction.currentHighestBid,
    currentHighestBidder: result.auction.currentHighestBidderId?.name || 'Anonymous',
    bid: {
      _id: result.bid._id,
      bidderId: req.user._id,
      bidderName: req.user.name,
      bidAmount: result.bid.bidAmount,
      timestamp: result.bid.timestamp
    }
  });

  io.to(`auction:${auctionId}`).emit('auctionUpdated', {
    auctionId,
    currentHighestBid: result.auction.currentHighestBid,
    currentHighestBidderId: result.auction.currentHighestBidderId?._id
  });

  res.status(201).json({ success: true, auction: result.auction, bid: result.bid });
});

export const getMyBids = asyncHandler(async (req, res) => {
  if (req.user.role !== 'Bidder') throw new AppError('Forbidden', 403);
  const bids = await Bid.find({ bidderId: req.user._id })
    .populate('auctionId', 'title status endTime winnerId winnerBidAmount images')
    .sort({ timestamp: -1 });
  res.json({ success: true, data: bids });
});

export const getAuctionBids = asyncHandler(async (req, res) => {
  const bids = await Bid.find({ auctionId: req.params.id }).populate('bidderId', 'name').sort({ timestamp: -1 });
  res.json({ success: true, data: bids });
});

export const getCurrentBid = asyncHandler(async (req, res) => {
  const auction = await Auction.findById(req.params.id).populate('currentHighestBidderId', 'name');
  if (!auction) return res.status(404).json({ success: false, message: 'Auction not found' });
  res.json({
    success: true,
    data: {
      currentHighestBid: auction.currentHighestBid,
      currentHighestBidder: auction.currentHighestBidderId?.name || null,
      status: auction.status,
      endTime: auction.endTime
    }
  });
});