import mongoose from 'mongoose';

const bidSchema = new mongoose.Schema(
  {
    auctionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true, index: true },
    bidderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    bidAmount: { type: Number, required: true, min: 0 },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

bidSchema.index({ auctionId: 1, timestamp: -1 });

export default mongoose.model('Bid', bidSchema);