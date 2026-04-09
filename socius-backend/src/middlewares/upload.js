const multer = require('multer');
const path = require('path');
const { resolveUploadDir } = require('../config/uploads');

// Helper to create storage with dynamic destination
const createStorage = (destFolder) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = resolveUploadDir(destFolder);
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
  storage: createStorage('issue-screenshots'),
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
    let folder = 'documents';
    if (file.fieldname === 'selfie' || file.fieldname === 'updated_selfie') {
      folder = 'selfies';
    } else {
      folder = 'documents';
    }
    const dir = resolveUploadDir(folder);
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
  storage: createStorage('closures'),
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).array('evidence', 5);

const uploadHelpCategoryIcon = multer({
  storage: createStorage('help-categories'),
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('icon');

const uploadPresenceCategoryIcon = multer({
  storage: createStorage('presence-categories'),
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('icon');

const uploadPresenceItemIcon = multer({
  storage: createStorage('presence-items'),
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('icon');

const uploadHelpCatalogItemIcon = multer({
  storage: createStorage('help-catalog-items'),
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('icon')

const prepareCardImageFilter = (req, file, cb) => {
  const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
  if (ok) {
    cb(null, true)
    return
  }
  cb(new Error('Only JPG, PNG, or WebP images are allowed'), false)
}

const uploadPrepareCardImage = multer({
  storage: createStorage('prepare-cards'),
  fileFilter: prepareCardImageFilter,
  limits: { fileSize: 3 * 1024 * 1024 },
}).single('image');

const chatMediaMimes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const chatMediaFilter = (req, file, cb) => {
  if (chatMediaMimes.has(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
    cb(null, true)
    return
  }
  cb(new Error('Unsupported file type for chat'), false)
}

const uploadChatMedia = multer({
  storage: createStorage('chat-media'),
  fileFilter: chatMediaFilter,
  limits: { fileSize: 15 * 1024 * 1024 },
}).single('file')

module.exports = { 
  upload, 
  uploadVerificationDocs, 
  uploadReviewDocs, 
  uploadClosureEvidence,
  uploadHelpCategoryIcon,
  uploadPresenceCategoryIcon,
  uploadPresenceItemIcon,
  uploadHelpCatalogItemIcon,
  uploadPrepareCardImage,
  uploadChatMedia,
};
