import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Auction from '../models/Auction.js';

const run = async () => {
  await connectDB();

  await User.deleteMany({});
  await Auction.deleteMany({});

  const passwordHash = await bcrypt.hash('Admin@12345', 12);

  const [admin, seller, bidder] = await User.create([
    { name: 'System Admin', email: 'admin@eauction.com', passwordHash, role: 'Admin' },
    { name: 'Demo Seller', email: 'seller@eauction.com', passwordHash, role: 'Seller' },
    { name: 'Demo Bidder', email: 'bidder@eauction.com', passwordHash, role: 'Bidder' }
  ]);

  const now = new Date();
  const past = new Date(now.getTime() - 10 * 60 * 1000);
  const in10Min = new Date(now.getTime() + 10 * 60 * 1000);
  const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const auctions = await Auction.create([
    {
      sellerId: seller._id,
      title: 'Vintage Film Camera',
      description: 'Classic film camera in excellent condition. Works perfectly, comes with carrying case and lens.',
      category: 'Electronics',
      images: [],
      basePrice: 150,
      currentHighestBid: 185,
      currentHighestBidderId: bidder._id,
      startTime: past,
      endTime: in2Hours,
      status: 'Live'
    },
    {
      sellerId: seller._id,
      title: 'Gold Pocket Watch',
      description: 'Antique gold pocket watch from 1920s. Fully functional with original chain.',
      category: 'Jewelry',
      images: [],
      basePrice: 500,
      currentHighestBid: 650,
      currentHighestBidderId: bidder._id,
      startTime: past,
      endTime: in24Hours,
      status: 'Live'
    },
    {
      sellerId: seller._id,
      title: 'Rare Book Collection',
      description: 'Set of 5 vintage books from 1st editions. Perfect condition, collector\'s items.',
      category: 'Books',
      images: [],
      basePrice: 200,
      currentHighestBid: 320,
      currentHighestBidderId: bidder._id,
      startTime: past,
      endTime: in48Hours,
      status: 'Live'
    },
    {
      sellerId: seller._id,
      title: 'Vintage Leather Briefcase',
      description: 'Handcrafted leather briefcase from 1950s. Shows character and patina. Excellent for collectors.',
      category: 'Accessories',
      images: [],
      basePrice: 100,
      currentHighestBid: 145,
      startTime: in10Min,
      endTime: in2Hours,
      status: 'Upcoming'
    },
    {
      sellerId: seller._id,
      title: 'Antique Wooden Clock',
      description: 'Hand-carved wooden grandfather clock mechanism. Needs restoration but all parts intact.',
      category: 'Home Decor',
      images: [],
      basePrice: 300,
      currentHighestBid: 300,
      startTime: in10Min,
      endTime: in24Hours,
      status: 'Upcoming'
    },
    {
      sellerId: seller._id,
      title: 'Signed Sports Memorabilia',
      description: 'Authentic signed jersey from famous athlete. Comes with certificate of authenticity.',
      category: 'Sports',
      images: [],
      basePrice: 250,
      currentHighestBid: 250,
      startTime: in10Min,
      endTime: in48Hours,
      status: 'Upcoming'
    }
  ]);

  console.log('\n✅ Seed complete');
  console.log('Admin:', admin.email);
  console.log('Seller:', seller.email);
  console.log('Bidder:', bidder.email);
  console.log(`\nCreated ${auctions.length} auctions`);
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});