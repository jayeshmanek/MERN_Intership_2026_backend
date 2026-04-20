import { Router } from 'express';
import {
  createAuction,
  deleteAuction,
  downloadAuctionInvoice,
  getAuctionById,
  getAuctions,
  updateAuction
} from '../controllers/auctionController.js';
import { getAuctionBids, getCurrentBid } from '../controllers/bidController.js';
import { authorize, protect } from '../middleware/auth.js';
import { upload, logUploadedFiles } from '../middleware/upload.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { auctionQuerySchema, createAuctionSchema, updateAuctionSchema } from '../validators/auctionValidator.js';

const router = Router();

router.get('/', validateQuery(auctionQuerySchema), getAuctions);
router.post('/', protect, authorize('Seller'), upload.array('images'), logUploadedFiles, validateBody(createAuctionSchema), createAuction);
router.get('/:id', getAuctionById);
router.patch('/:id', protect, authorize('Seller'), upload.array('images'), logUploadedFiles, validateBody(updateAuctionSchema), updateAuction);
router.delete('/:id', protect, authorize('Seller'), deleteAuction);
router.get('/:id/bids', getAuctionBids);
router.get('/:id/current-bid', getCurrentBid);
router.get('/:id/invoice', protect, downloadAuctionInvoice);

export default router;