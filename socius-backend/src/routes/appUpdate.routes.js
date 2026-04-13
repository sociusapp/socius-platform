const router = require('express').Router();
const fs = require('fs');
const { resolveUploadRootFile } = require('../config/uploads');
const { upload, uploadAPK, getUpdateInfo, deleteAPK, getDownloadStats } = require('../controllers/appUpdate.controller');

// Public routes
router.get('/check-update', async (req, res) => {
  try {
    const { version: currentVersion, platform } = req.query;
    
    // Get current update info
    const configPath = resolveUploadRootFile('update-config.json');
    let updateInfo;
    
    if (fs.existsSync(configPath)) {
      updateInfo = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else {
      // Default config
      updateInfo = {
        versionCode: 1,
        versionName: '1.0.0',
        apkUrl: `${req.protocol}://${req.get('host')}/api/app-update/download`,
        isForceUpdate: false,
        releaseNotes: [
          '🎉 Initial release',
          '� Basic features',
          '� User authentication'
        ],
        fileSize: '25.3 MB',
        minSupportedVersion: 1,
        platform: platform || 'android'
      };
    }

    // Add download URL
    updateInfo.apkUrl = `${req.protocol}://${req.get('host')}/api/app-update/download`;

    res.json({
      success: true,
      data: updateInfo
    });

  } catch (error) {
    console.error('Update check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check for updates'
    });
  }
});

// Download latest APK
router.get('/download', (req, res) => {
  try {
    const apkPath = resolveUploadRootFile('app-latest.apk');
    
    if (!fs.existsSync(apkPath)) {
      return res.status(404).json({
        success: false,
        message: 'APK file not found'
      });
    }

    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="socius-app-latest.apk"');
    
    const fileStream = fs.createReadStream(apkPath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download APK'
    });
  }
});

// Get update history
router.get('/history', async (req, res) => {
  try {
    const history = [
      {
        versionCode: 2,
        versionName: '1.1.0',
        releaseDate: '2024-03-30',
        changes: [
          '🚀 Faster loading speed',
          '🐛 Fixed login issues', 
          '🌙 Added dark mode'
        ]
      },
      {
        versionCode: 1,
        versionName: '1.0.0',
        releaseDate: '2024-03-15',
        changes: [
          '🎉 Initial release',
          '📱 Basic features',
          '🔐 User authentication'
        ]
      }
    ];

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get update history'
    });
  }
});

// Admin routes (require authentication)
router.post('/admin/upload', upload.single('apk'), uploadAPK);
router.get('/admin/info', getUpdateInfo);
router.delete('/admin/delete', deleteAPK);
router.get('/admin/stats', getDownloadStats);

module.exports = router;
