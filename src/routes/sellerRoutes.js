import { Router } from 'express';
import { authorize, protect } from '../middleware/auth.js';
import {
  deleteSellerAuctionBid,
  getSellerAuctionBids,
  getSellerAuctions,
  getSellerAuctionWinner
} from '../controllers/auctionController.js';

const router = Router();
router.use(protect, authorize('Seller'));

router.get('/auctions', getSellerAuctions);
router.get('/auctions/:id/bids', getSellerAuctionBids);
router.delete('/auctions/:id/bids/:bidId', deleteSellerAuctionBid);
router.get('/auctions/:id/winner', getSellerAuctionWinner);

export default router;