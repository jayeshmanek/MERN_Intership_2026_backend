import { Router } from 'express';
import { getMarketplace, getMarketplaceById } from '../controllers/auctionController.js';
import { validateQuery } from '../middleware/validate.js';
import { auctionQuerySchema } from '../validators/auctionValidator.js';

const router = Router();

router.get('/', validateQuery(auctionQuerySchema), getMarketplace);
router.get('/:id', getMarketplaceById);

export default router;