"use strict";

const Authentication = require('./controllers/authentication');
const Photon = require('./controllers/photon');
const passportService = require('./services/passport');
const passport = require('passport');

// session : false, not save cookies (working with jwt)
const requireAuth = passport.authenticate('jwt', { session: false });
const requireSignin = passport.authenticate('local', { session: false });

module.exports = function(app) {

  app.get('/', requireAuth, function(req, res) {
    return res.sendStatus(200);
  });

  app.get('/health', function(req, res) {
    return res.sendStatus(200);
  });

  app.post('/signin', requireSignin, Authentication.signin);
  app.post('/signup', Authentication.signup);

  app.post('/sendSocketInformation', Photon.sendSocketInformation);
  app.get('/getServerInformation', Photon.getServerInformation);
  app.post('/claimDevice', requireAuth, Photon.claimDevice);
  app.get('/listDevices', requireAuth, Photon.listDevices);
  app.get('/deviceDetails', requireAuth, Photon.deviceDetails);
  app.get('/deviceMostRecentData', requireAuth, Photon.deviceMostRecentData);
  app.post('/changeDeviceStatus', requireAuth, Photon.changeDeviceStatus);
};
