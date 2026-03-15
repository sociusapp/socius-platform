const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Helper to create storage with dynamic destination
const createStorage = (destFolder) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../', destFolder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, (file.fieldname || 'file') + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only images and PDFs are allowed!'), false);
  }
};

// Generic uploader for issues
const upload = multer({
  storage: createStorage('uploads/issue-screenshots'),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images and audio files are allowed!'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for audio
});

// Verification uploader (Gov ID to documents, Selfie to selfies)
const verificationStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'uploads/documents';
    if (file.fieldname === 'selfie' || file.fieldname === 'updated_selfie') {
      folder = 'uploads/selfies';
    }
    const dir = path.join(__dirname, '../../', folder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const verificationUpload = multer({
  storage: verificationStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadVerificationDocs = verificationUpload.fields([
  { name: 'government_id', maxCount: 1 },
  { name: 'selfie', maxCount: 1 }
]);

const uploadReviewDocs = verificationUpload.fields([
  { name: 'updated_doc', maxCount: 1 },
  { name: 'updated_selfie', maxCount: 1 }
]);

const uploadClosureEvidence = multer({
  storage: createStorage('uploads/closures'),
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).array('evidence', 5);

const uploadHelpCategoryIcon = multer({
  storage: createStorage('uploads/help-categories'),
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('icon');

module.exports = { 
  upload, 
  uploadVerificationDocs, 
  uploadReviewDocs, 
  uploadClosureEvidence,
  uploadHelpCategoryIcon
};
