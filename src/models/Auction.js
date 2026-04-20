import mongoose from 'mongoose';

const auctionSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, required: true, trim: true, maxlength: 80, index: true },
    images: [{ type: String }],
    basePrice: { type: Number, required: true, min: 0, index: true },
    currentHighestBid: { type: Number, default: 0 },
    currentHighestBidderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true, index: true },
    status: { type: String, enum: ['Upcoming', 'Live', 'Ended'], default: 'Upcoming', index: true },
    winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    winnerBidAmount: { type: Number, default: null },
    isArchived: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

auctionSchema.index({ title: 'text', description: 'text' });
auctionSchema.index({ status: 1, category: 1, endTime: 1 });

export default mongoose.model('Auction', auctionSchema);