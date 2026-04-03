const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'app-latest.apk');
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.android.package-archive' || 
        file.originalname.endsWith('.apk')) {
      cb(null, true);
    } else {
      cb(new Error('Only APK files are allowed'));
    }
  }
});

// Upload new APK
const uploadAPK = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No APK file uploaded'
      });
    }

    const { versionCode, versionName, isForceUpdate, releaseNotes } = req.body;

    // Validate required fields
    if (!versionCode || !versionName) {
      return res.status(400).json({
        success: false,
        message: 'Version code and version name are required'
      });
    }

    // Create update config file
    const config = {
      versionCode: parseInt(versionCode),
      versionName,
      isForceUpdate: isForceUpdate === 'true',
      releaseNotes: releaseNotes ? releaseNotes.split(',').map(note => note.trim()) : [],
      uploadDate: new Date().toISOString(),
      fileSize: `${(req.file.size / (1024 * 1024)).toFixed(1)} MB`
    };

    // Save config (in production, save to database)
    const configPath = path.join(__dirname, '../uploads/update-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    res.json({
      success: true,
      message: 'APK uploaded successfully',
      data: config
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload APK'
    });
  }
};

// Get current update info
const getUpdateInfo = async (req, res) => {
  try {
    const configPath = path.join(__dirname, '../uploads/update-config.json');
    
    if (!fs.existsSync(configPath)) {
      return res.json({
        success: true,
        data: {
          versionCode: 1,
          versionName: '1.0.0',
          isForceUpdate: false,
          releaseNotes: ['Initial release'],
          uploadDate: new Date().toISOString(),
          fileSize: '0 MB'
        }
      });
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    console.error('Get update info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get update info'
    });
  }
};

// Delete current APK
const deleteAPK = async (req, res) => {
  try {
    const apkPath = path.join(__dirname, '../uploads/app-latest.apk');
    const configPath = path.join(__dirname, '../uploads/update-config.json');

    // Delete APK file
    if (fs.existsSync(apkPath)) {
      fs.unlinkSync(apkPath);
    }

    // Delete config file
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }

    res.json({
      success: true,
      message: 'APK deleted successfully'
    });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete APK'
    });
  }
};

// Get download statistics
const getDownloadStats = async (req, res) => {
  try {
    // In production, track downloads in database
    const stats = {
      totalDownloads: 0,
      recentDownloads: 0,
      lastUpdated: null
    };

    const configPath = path.join(__dirname, '../uploads/update-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      stats.lastUpdated = config.uploadDate;
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get download stats'
    });
  }
};

module.exports = {
  uploadAPK,
  getUpdateInfo,
  deleteAPK,
  getDownloadStats,
  upload
};
