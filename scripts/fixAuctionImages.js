import mongoose from 'mongoose';
import Auction from '../src/models/Auction.js';
import { env } from '../src/config/env.js';
import path from 'path';
import fs from 'fs';

const uploadRoot = path.resolve(process.cwd(), 'uploads');

async function fixImages() {
  await mongoose.connect(env.mongoUri);
  console.log('🔗 Connected to MongoDB');

  const auctions = await Auction.find({ images: { $exists: true, $ne: [] } });
  console.log(`📊 Found ${auctions.length} auctions with images`);

  let fixedCount = 0;
  let migrated = 0;

  for (const auction of auctions) {
    let changed = false;
    const newImages = [];

    for (const img of auction.images) {
      let normalized = String(img).trim();
      
      // Skip if already good
      if (normalized.startsWith('http://') || normalized.startsWith('/uploads/')) {
        newImages.push(normalized);
        continue;
      }

      // Fix bare filename → /uploads/filename
      if (normalized && !normalized.includes('/')) {
        const filename = normalized;
        normalized = `/uploads/${filename}`;
        migrated++;
        changed = true;
        console.log(`🔧 Fixed auction ${auction._id}: "${filename}" → "${normalized}"`);
      }

      // Verify file exists
      if (normalized.startsWith('/uploads/')) {
        const filePath = path.join(uploadRoot, path.basename(normalized));
        if (fs.existsSync(filePath)) {
          newImages.push(normalized);
        } else {
          console.warn(`⚠️  File missing: ${filePath}`);
        }
      } else {
        newImages.push(normalized);
      }
    }

    if (changed && newImages.length > 0) {
      auction.images = newImages;
      await auction.save();
      fixedCount++;
    }
  }

  console.log(`✅ Migration complete: ${fixedCount} updated, ${migrated} paths fixed`);
  await mongoose.connection.close();
}

fixImages().catch(console.error);
