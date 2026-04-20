import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';

const uploadPath = path.join(process.cwd(), env.uploadDir);
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

console.log('📁 [Multer] Upload directory configured:', uploadPath);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    console.log('📁 [Multer] Destination callback - saving to:', uploadPath);
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${unique}${path.extname(file.originalname)}`;
    console.log('📝 [Multer] Filename generation:', {
      original: file.originalname,
      generated: filename,
      mimetype: file.mimetype,
      size: `${(file.size / 1024).toFixed(2)} KB`
    });
    cb(null, filename);
  }
});

export const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    console.log('🔍 [Multer] File filter check:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype
    });
    
    if (!String(file.mimetype || '').toLowerCase().startsWith('image/')) {
      console.error('❌ [Multer] File rejected - not an image:', file.mimetype);
      return cb(new Error('Only image files are allowed'));
    }
    
    console.log('✅ [Multer] File accepted');
    cb(null, true);
  }
});

// Middleware to log uploaded files
export const logUploadedFiles = (req, res, next) => {
  if (req.files && req.files.length > 0) {
    console.log('\n📸 [Upload Middleware] Files uploaded successfully:');
    req.files.forEach((file, idx) => {
      console.log(`  [${idx + 1}] ${file.originalname}`);
      console.log(`      └─ Field: ${file.fieldname}`);
      console.log(`      └─ Saved as: /uploads/${file.filename}`);
      console.log(`      └─ Size: ${(file.size / 1024).toFixed(2)} KB`);
    });
  } else if (req.file) {
    console.log('\n📸 [Upload Middleware] Single file uploaded:');
    console.log(`  ${req.file.originalname} → /uploads/${req.file.filename}`);
  } else {
    console.log('\n📸 [Upload Middleware] No files uploaded');
  }
  next();
};