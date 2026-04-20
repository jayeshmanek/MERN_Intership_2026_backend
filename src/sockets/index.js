import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';
import { placeBidAtomic } from '../services/bidService.js';
import Auction from '../models/Auction.js';
import User from '../models/User.js';
import { allowedOrigins } from '../config/cors.js';

export const setupSocket = () => {
  const io = new Server({
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
      allowEIO3: true
    },
    transports: ['websocket', 'polling'],
    path: '/socket.io'
  });

  console.log('🔌 [Socket.io] Allowed origins:', allowedOrigins);

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      console.log('🔐 [Socket.io] Auth middleware - token:', token ? '✓ Found' : '✗ Not found');
      
      if (!token) {
        console.log('⚠️ [Socket.io] No token, allowing anonymous connection');
        return next();
      }
      
      const payload = verifyToken(token);
      socket.user = payload;
      console.log('✅ [Socket.io] User authenticated:', { userId: payload.userId, role: payload.role });
      return next();
    } catch (error) {
      console.error('❌ [Socket.io] Token verification failed:', error.message);
      return next();
    }
  });

  io.on('connection', (socket) => {
    console.log('👤 [Socket.io] User connected:', { socketId: socket.id, userId: socket.user?.userId });
    
    socket.on('joinAuction', async ({ auctionId }) => {
      console.log('📍 [Socket.io] User joining auction:', { auctionId, socketId: socket.id });
      socket.join(`auction:${auctionId}`);
      try {
        const auction = await Auction.findById(auctionId).populate('currentHighestBidderId', 'name');
        console.log('✅ [Socket.io] Auction state sent:', { auctionId, currentBid: auction.currentHighestBid });
        socket.emit('refreshAuctionState', { auction });
      } catch (error) {
        console.error('❌ [Socket.io] Error fetching auction:', error.message);
      }
    });

    socket.on('leaveAuction', ({ auctionId }) => {
      console.log('👋 [Socket.io] User leaving auction:', { auctionId, socketId: socket.id });
      socket.leave(`auction:${auctionId}`);
    });

    socket.on('placeBid', async ({ auctionId, bidAmount }) => {
      try {
        if (!socket.user?.userId) {
          console.error('❌ [Socket.io] Bid attempt without authentication');
          socket.emit('bidRejected', { error: 'Authentication required' });
          return;
        }

        console.log('💰 [Socket.io] Bid attempt:', { auctionId, bidAmount, bidderId: socket.user.userId });
        
        const bidder = await User.findById(socket.user.userId);
        if (!bidder) {
          console.error('❌ [Socket.io] Bidder not found');
          socket.emit('bidRejected', { error: 'User not found' });
          return;
        }
        
        if (bidder.status !== 'active') {
          console.error('❌ [Socket.io] Bidder account inactive:', bidder.status);
          socket.emit('bidRejected', { error: 'Your account is inactive' });
          return;
        }
        
        if (bidder.role !== 'Bidder') {
          console.error('❌ [Socket.io] Non-bidder attempting to bid:', bidder.role);
          socket.emit('bidRejected', { error: 'Only bidders can place bids' });
          return;
        }

        const result = await placeBidAtomic({ auctionId, bidAmount, bidder });
        console.log('✅ [Socket.io] Bid accepted:', { auctionId, newBid: result.auction.currentHighestBid });
        io.to(`auction:${auctionId}`).emit('bidAccepted', {
          auctionId,
          currentHighestBid: result.auction.currentHighestBid,
          currentHighestBidder: bidder?.name || 'Bidder',
          bid: {
            _id: result.bid._id,
            bidderId: bidder?._id,
            bidderName: bidder?.name,
            bidAmount: result.bid.bidAmount,
            timestamp: result.bid.timestamp
          }
        });
      } catch (error) {
        socket.emit('bidRejected', { message: error.message });
      }
    });
  });

  return io;
};
