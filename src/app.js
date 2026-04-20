import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import auctionRoutes from './routes/auctionRoutes.js';
import marketplaceRoutes from './routes/marketplaceRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import sellerRoutes from './routes/sellerRoutes.js';
import { buildBidRoutes } from './routes/bidRoutes.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { env } from './config/env.js';
import { corsOptions } from './config/cors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const buildApp = (io) => {
  const app = express();
  app.set('io', io);

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));

  // Enhanced request logging
  app.use((req, res, next) => {
    console.log(`\n📨 ${req.method} ${req.path}`);
    console.log('Headers:', { 
      origin: req.headers.origin, 
      contentType: req.headers['content-type'],
      authorization: req.headers.authorization ? 'Bearer token present' : 'No auth'
    });
    
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      console.log('📤 Multipart request detected - files will be processed by multer');
    } else {
      console.log('BODY:', req.body);
    }
    
    next();
  });

  app.use(morgan('dev'));

  app.use('/uploads', express.static(path.resolve(__dirname, '..', env.uploadDir)));

  app.get('/api/health', (_req, res) => res.json({ success: true, message: 'OK' }));
  
  // Test endpoint to verify routing
  app.post('/api/test', (req, res) => {
    res.json({ success: true, message: 'Backend is working', receivedData: req.body });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/auctions', auctionRoutes);
  app.use('/api/marketplace', marketplaceRoutes);
  app.use('/api/bids', buildBidRoutes(io));
  app.use('/api/admin', adminRoutes);
  app.use('/api/seller', sellerRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
