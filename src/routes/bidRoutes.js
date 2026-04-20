import { Router } from 'express';
import { getAuctionBids, getCurrentBid, getMyBids, placeBid } from '../controllers/bidController.js';
import { authorize, protect } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { placeBidSchema } from '../validators/bidValidator.js';

export const buildBidRoutes = (io) => {
  const router = Router();

  router.post('/', protect, authorize('Bidder'), validateBody(placeBidSchema), placeBid(io));
  router.get('/my', protect, authorize('Bidder'), getMyBids);
  router.get('/auction/:id/bids', getAuctionBids);
  router.get('/auction/:id/current-bid', getCurrentBid);

  return router;
};