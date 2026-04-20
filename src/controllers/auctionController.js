import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import User from '../models/User.js';
import { asyncHandler, AppError } from '../utils/errors.js';
import { calculateAuctionStatus } from '../jobs/auctionLifecycleJob.js';
import { logAction } from '../utils/auditLogger.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';

const uploadRoot = path.resolve(process.cwd(), env.uploadDir);

const normalizeImagePath = (value = '') => {
  if (!value) return value;
  const unix = String(value).trim().replace(/\\/g, '/');
  const idx = unix.toLowerCase().lastIndexOf('/uploads/');
  if (idx >= 0) return unix.slice(idx);
  const publicIdx = unix.toLowerCase().lastIndexOf('/images/');
  if (publicIdx >= 0) return unix.slice(publicIdx);
  if (unix.startsWith('uploads/')) return `/${unix}`;
  if (unix.startsWith('images/')) return `/${unix}`;
  if (unix.startsWith('/')) return unix;
  const fileName = unix.split('/').pop();
  if (fs.existsSync(path.join(uploadRoot, fileName))) return `/uploads/${fileName}`;
  return `/images/${fileName}`;
};

const isStoredImageAvailable = (imagePath) => {
  if (!imagePath) return false;
  if (!imagePath.startsWith('/uploads/')) return true;
  const fileName = path.basename(imagePath);
  return fs.existsSync(path.join(uploadRoot, fileName));
};

const sanitizeAuctionImages = (images = []) => {
  const values = Array.isArray(images) ? images : [images];
  const unique = [];

  values.forEach((value) => {
    const normalized = normalizeImagePath(value);
    if (!normalized) return;
    if (!isStoredImageAvailable(normalized)) return;
    if (!unique.includes(normalized)) unique.push(normalized);
  });

  return unique;
};

const toAbsoluteImage = (path, req) => {
  if (!path) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/images/') || path === '/default.png' || path === '/e-auction-hero.svg') return path;
  return `${req.protocol}://${req.get('host')}${path.startsWith('/') ? path : `/${path}`}`;
};

const toResponseImage = (imagePath, req) => {
  if (!imagePath) return '';
  const value = String(imagePath);
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/images/')) {
    return toAbsoluteImage(value, req);
  }
  return toAbsoluteImage(normalizeImagePath(value), req);
};

const normalizeAuctionImages = (auction, req) => {
  if (!auction) return auction;
  const data = auction.toObject ? auction.toObject() : auction;
  data.images = sanitizeAuctionImages(data.images).map((img) => toAbsoluteImage(img, req));
  data.image = data.image ? toResponseImage(data.image, req) : data.images[0] || '';
  return data;
};

const buildAuctionListQuery = (query) => {
  const filter = { deletedAt: null };
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.basePrice = {};
    if (query.minPrice !== undefined) filter.basePrice.$gte = query.minPrice;
    if (query.maxPrice !== undefined) filter.basePrice.$lte = query.maxPrice;
  }
  if (query.q) filter.$text = { $search: query.q };
  if (query.endingSoon) {
    filter.endTime = { $gte: new Date(), $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) };
  }

  let sort = { createdAt: -1 };
  if (query.sortBy === 'endingSoon') sort = { endTime: 1 };
  if (query.sortBy === 'priceAsc') sort = { currentHighestBid: 1, basePrice: 1 };
  if (query.sortBy === 'priceDesc') sort = { currentHighestBid: -1, basePrice: -1 };

  return { filter, sort };
};

export const createAuction = asyncHandler(async (req, res) => {
  console.log('\n📝 [createAuction] Starting auction creation');
  console.log('🔐 [createAuction] Authenticated user:', { id: req.user._id, name: req.user.name, role: req.user.role });
  console.log('📦 [createAuction] Request body:', {
    title: req.body.title,
    description: req.body.description,
    category: req.body.category,
    basePrice: req.body.basePrice,
    startTime: req.body.startTime,
    endTime: req.body.endTime
  });

  // Log file details
  console.log('📸 [createAuction] Files received:');
  console.log('  - req.files:', req.files ? `Array with ${req.files.length} file(s)` : 'undefined');
  console.log('  - req.file:', req.file ? `Single file: ${req.file.filename}` : 'undefined');
  
  if (req.files && req.files.length > 0) {
    console.log('  - File details:');
    req.files.forEach((file, idx) => {
      console.log(`    [${idx + 1}] ${file.originalname} (${(file.size / 1024).toFixed(2)} KB) → /uploads/${file.filename}`);
    });
  }

  // Validate user exists
  if (!req.user || !req.user._id) {
    console.error('❌ [createAuction] User not found in request');
    throw new AppError('User not found. Please log in again.', 401);
  }

  // Verify user still exists in database
  const userExists = await User.findById(req.user._id);
  if (!userExists) {
    console.error('❌ [createAuction] User not found in database:', req.user._id);
    throw new AppError('User not found in database', 404);
  }
  console.log('✅ [createAuction] User verified:', userExists.name);

  // Handle images - make optional
  const imagePaths = sanitizeAuctionImages((req.files || []).map((file) => `/uploads/${file.filename}`));
  console.log('📸 [createAuction] Sanitized image paths:', imagePaths);
  console.log('📊 [createAuction] Total images after sanitization:', imagePaths.length);

  // Map field names if needed (startingPrice -> basePrice)
  const auctionData = {
    ...req.body,
    basePrice: req.body.basePrice || req.body.startingPrice,
    sellerId: req.user._id,
    images: imagePaths,
    currentHighestBid: req.body.basePrice || req.body.startingPrice,
    status: calculateAuctionStatus(req.body)
  };

  console.log('💾 [createAuction] Saving auction with data:', {
    title: auctionData.title,
    category: auctionData.category,
    sellerId: auctionData.sellerId,
    basePrice: auctionData.basePrice,
    startTime: auctionData.startTime,
    endTime: auctionData.endTime,
    imagesCount: auctionData.images.length,
    images: auctionData.images
  });

  const auction = await Auction.create(auctionData);
  console.log('✅ [createAuction] Auction created successfully:', {
    auctionId: auction._id,
    title: auction.title,
    imagesStored: auction.images
  });

  await logAction({ userId: req.user._id, action: 'AUCTION_CREATED', entityType: 'Auction', entityId: auction._id });

  const response = normalizeAuctionImages(auction, req);
  console.log('📤 [createAuction] Sending response with normalized images:', {
    auctionId: response._id,
    title: response.title,
    images: response.images
  });

  res.status(201).json({ success: true, message: 'Auction created successfully', auction: response });
});

export const getAuctions = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const { filter, sort } = buildAuctionListQuery(req.query);
  const skip = (page - 1) * limit;

  console.log('🔍 [getAuctions] Query params:', req.query);
  console.log('🔍 [getAuctions] Filter:', JSON.stringify(filter, null, 2));
  console.log('🔍 [getAuctions] Sort:', sort);
  console.log('🔍 [getAuctions] Pagination: page=%d, limit=%d, skip=%d', page, limit, skip);

  const [items, total] = await Promise.all([
    Auction.find(filter)
      .populate('sellerId', 'name')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Auction.countDocuments(filter)
  ]);

  console.log('✅ [getAuctions] Found %d auctions out of %d total', items.length, total);
  console.log('📦 [getAuctions] Response:', { total, found: items.length, page, limit });

  res.json({
    success: true,
    data: items.map((item) => normalizeAuctionImages(item, req)),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
});

export const getAuctionById = asyncHandler(async (req, res) => {
  const auction = await Auction.findOne({ _id: req.params.id, deletedAt: null })
    .populate('sellerId', 'name email')
    .populate('currentHighestBidderId', 'name')
    .populate('winnerId', 'name email');

  if (!auction) throw new AppError('Auction not found', 404);
  const response = normalizeAuctionImages(auction, req);
  console.log('Auction detail:', {
    _id: response._id,
    title: response.title,
    image: response.image,
    images: response.images
  });
  res.json({ success: true, auction: response });
});

export const updateAuction = asyncHandler(async (req, res) => {
  const auction = await Auction.findOne({ _id: req.params.id, deletedAt: null });
  if (!auction) throw new AppError('Auction not found', 404);
  if (auction.sellerId.toString() !== req.user._id.toString()) throw new AppError('Forbidden', 403);
  if (auction.status !== 'Upcoming') throw new AppError('Can edit only before auction is live', 409);

  if (Array.isArray(req.body.images)) {
    req.body.images = sanitizeAuctionImages(req.body.images);
  }

  if (req.files?.length) {
    const uploadedImages = sanitizeAuctionImages(req.files.map((file) => `/uploads/${file.filename}`));
    const keptImages = Array.isArray(req.body.images) ? req.body.images : sanitizeAuctionImages(auction.images);
    req.body.images = sanitizeAuctionImages([...keptImages, ...uploadedImages]);
  }

  Object.assign(auction, req.body);
  auction.status = calculateAuctionStatus(auction);
  await auction.save();

  await logAction({ userId: req.user._id, action: 'AUCTION_UPDATED', entityType: 'Auction', entityId: auction._id });

  res.json({ success: true, auction: normalizeAuctionImages(auction, req) });
});

export const deleteAuction = asyncHandler(async (req, res) => {
  const auction = await Auction.findOne({ _id: req.params.id, deletedAt: null });
  if (!auction) throw new AppError('Auction not found', 404);
  if (auction.sellerId.toString() !== req.user._id.toString()) throw new AppError('Forbidden', 403);
  if (auction.status !== 'Upcoming') throw new AppError('Can delete only before auction is live', 409);

  auction.deletedAt = new Date();
  auction.deletedBy = req.user._id;
  auction.isArchived = true;
  await auction.save();

  await logAction({ userId: req.user._id, action: 'AUCTION_SOFT_DELETED', entityType: 'Auction', entityId: auction._id });

  res.json({ success: true, message: 'Auction archived' });
});

export const getSellerAuctions = asyncHandler(async (req, res) => {
  console.log('\n📡 [getSellerAuctions] Fetching auctions for seller:', req.user._id);
  
  const auctions = await Auction.find({ sellerId: req.user._id, deletedAt: null }).sort({ createdAt: -1 });
  
  console.log('✅ [getSellerAuctions] Found', auctions.length, 'auctions');
  console.log('📋 [getSellerAuctions] Auction titles:', auctions.map(a => a.title));
  
  const response = auctions.map((item) => normalizeAuctionImages(item, req));
  
  res.json({ success: true, data: response });
});

export const getSellerAuctionBids = asyncHandler(async (req, res) => {
  const auction = await Auction.findOne({ _id: req.params.id, sellerId: req.user._id, deletedAt: null });
  if (!auction) throw new AppError('Auction not found', 404);

  const bids = await Bid.find({ auctionId: auction._id }).populate('bidderId', 'name email').sort({ timestamp: -1 });
  res.json({ success: true, data: bids });
});

export const deleteSellerAuctionBid = asyncHandler(async (req, res) => {
  const auction = await Auction.findOne({ _id: req.params.id, sellerId: req.user._id, deletedAt: null });
  if (!auction) throw new AppError('Auction not found', 404);
  if (auction.status === 'Ended') throw new AppError('Cannot delete bids after auction ends', 409);

  const bid = await Bid.findOne({ _id: req.params.bidId, auctionId: auction._id });
  if (!bid) throw new AppError('Bid not found', 404);

  await bid.deleteOne();

  const highestBid = await Bid.findOne({ auctionId: auction._id }).sort({ bidAmount: -1, timestamp: -1 });
  if (highestBid) {
    auction.currentHighestBid = highestBid.bidAmount;
    auction.currentHighestBidderId = highestBid.bidderId;
  } else {
    auction.currentHighestBid = auction.basePrice;
    auction.currentHighestBidderId = null;
  }
  auction.winnerId = null;
  auction.winnerBidAmount = null;
  await auction.save();

  await logAction({
    userId: req.user._id,
    action: 'SELLER_DELETED_BID',
    entityType: 'Bid',
    entityId: bid._id,
    metadata: {
      auctionId: auction._id,
      bidAmount: bid.bidAmount,
      bidderId: bid.bidderId
    }
  });

  const io = req.app.get('io');
  if (io) {
    const refreshed = await Auction.findById(auction._id)
      .populate('sellerId', 'name email')
      .populate('currentHighestBidderId', 'name')
      .populate('winnerId', 'name email');

    io.to(`auction:${auction._id}`).emit('auctionUpdated', {
      auctionId: auction._id,
      currentHighestBid: refreshed.currentHighestBid,
      currentHighestBidderId: refreshed.currentHighestBidderId?._id || null
    });
    io.to(`auction:${auction._id}`).emit('refreshAuctionState', {
      auction: normalizeAuctionImages(refreshed, req)
    });
  }

  res.json({ success: true, message: 'Bid deleted successfully' });
});

export const getSellerAuctionWinner = asyncHandler(async (req, res) => {
  const auction = await Auction.findOne({ _id: req.params.id, sellerId: req.user._id, deletedAt: null }).populate('winnerId', 'name email');
  if (!auction) throw new AppError('Auction not found', 404);
  if (auction.status !== 'Ended') throw new AppError('Auction has not ended yet', 409);

  res.json({
    success: true,
    data: {
      auctionId: auction._id,
      winner: auction.winnerId,
      winnerBidAmount: auction.winnerBidAmount
    }
  });
});

export const downloadAuctionInvoice = asyncHandler(async (req, res) => {
  const auction = await Auction.findOne({ _id: req.params.id, deletedAt: null })
    .populate('sellerId', 'name email')
    .populate('winnerId', 'name email');

  if (!auction) throw new AppError('Auction not found', 404);
  if (auction.status !== 'Ended') throw new AppError('Invoice is available only after auction ends', 409);
  if (!auction.winnerId) throw new AppError('Auction ended without a winner', 409);

  const userId = req.user._id.toString();
  const isAdmin = req.user.role === 'Admin';
  const isWinner = auction.winnerId._id.toString() === userId;
  const isSeller = auction.sellerId._id.toString() === userId;

  if (!isAdmin && !isWinner && !isSeller) {
    throw new AppError('Only winner, seller, or admin can download this invoice', 403);
  }

  const invoiceNumber = `INV-${auction._id.toString().slice(-6).toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const filename = `invoice-${auction._id}.pdf`;

  await logAction({
    userId: req.user._id,
    action: 'INVOICE_DOWNLOADED',
    entityType: 'Auction',
    entityId: auction._id,
    metadata: { invoiceNumber }
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=\"${filename}\"`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(24).text('E-Auction Invoice', { align: 'left' });
  doc.moveDown(0.4);
  doc.fontSize(11).fillColor('#555').text(`Invoice No: ${invoiceNumber}`);
  doc.text(`Generated: ${new Date().toLocaleString()}`);
  doc.moveDown(1);

  doc.fillColor('#000').fontSize(16).text('Auction Summary');
  doc.moveDown(0.4);
  doc.fontSize(12).text(`Auction ID: ${auction._id}`);
  doc.text(`Item: ${auction.title}`);
  doc.text(`Category: ${auction.category}`);
  doc.text(`Auction Ended: ${new Date(auction.endTime).toLocaleString()}`);
  doc.moveDown(0.8);

  doc.fontSize(16).text('Parties');
  doc.moveDown(0.4);
  doc.fontSize(12).text(`Seller: ${auction.sellerId?.name || 'N/A'} (${auction.sellerId?.email || 'N/A'})`);
  doc.text(`Winner: ${auction.winnerId?.name || 'N/A'} (${auction.winnerId?.email || 'N/A'})`);
  doc.moveDown(0.8);

  doc.fontSize(16).text('Financials');
  doc.moveDown(0.4);
  doc.fontSize(12).text(`Base Price: INR ${auction.basePrice}`);
  doc.text(`Final Winning Bid: INR ${auction.winnerBidAmount || auction.currentHighestBid}`);
  doc.moveDown(0.8);

  doc.fontSize(10).fillColor('#666').text(
    'This document is system-generated for academic project demonstration and auction record-keeping. No payment processing is included in this platform.',
    { align: 'left' }
  );

  doc.end();
});

export const getMarketplace = getAuctions;
export const getMarketplaceById = getAuctionById;
