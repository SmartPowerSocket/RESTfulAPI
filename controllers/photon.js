"use strict";

const Device = require('../models/device');
const DeviceData = require('../models/deviceData');
const request = require('request');

exports.sendSocketInformation = function(req, res) {

  const apiKey = req.body.apiKey;
  const coreid = String(req.body.coreid);
  const current = Number(req.body.current);
  const tension = Number(req.body.tension);

  Device.findOne({photonId: coreid, apiKey: apiKey, "state.status": { $ne: Device.STATUS.DELETED } }).lean().exec().then(function(device) {
    if (device) {
      const deviceData = new DeviceData({
        deviceId: device._id,
        current: current,
        tension: tension,
        apparentPower: current * tension
      });

      deviceData.save().then(function() {
        return res.sendStatus(200);
      }).fail(function(error) {
        return res.status(422).send({error: error.errors});
      });
    } else {
      return res.status(422).send({error: "Authentication failed!"});
    }

  });
};

exports.getServerInformation = function(req, res) {

  if (req.query && req.query.data) {
    const data = JSON.parse(req.query.data);

    const apiKey = data.apiKey;
    const coreid = req.query.coreid;

    Device.findOne({photonId: coreid, apiKey: apiKey}).sort({claimDate: -1}).lean().exec().then(function(device) {
      if (device) {
        return res.status(200).send(device.state);
      } else {
        return res.status(422).send({error: "Authentication failed!"});
      }
    });
  } else { 
    return res.sendStatus(422);
  }

};

exports.claimDevice = function(req, res) {

  const device = new Device({
    claimDate: Date.now(),
    userId: req.user._id,
    photonId: req.body.deviceId,
    photonName: "New Device", //req.body.deviceName,
    apiKey: req.user.apiKey,
    state: {
      status: Device.STATUS.ACTIVE
    }
  });

  device.save().then(function(device) {
      // Respond to request indicating the device was claimed
      return res.sendStatus(200);
  }).fail(function (error) {
      return res.status(422).send({error: error.errors});
  });

};

exports.listDevices = function(req, res) {

  Device.find({userId: req.user._id, "state.status": { $ne: Device.STATUS.DELETED } }).lean().exec().then(function(devices) {
    if (!devices) {
      res.status(400).send({error: "No devices found!"});
    }
    res.status(200).send({devices: devices});
  });

};

exports.deviceDetails = function(req, res) {

  if (!req.query.id) {
    return res.status(400).send({error: "No device id sent!"});
  }

  Device.findOne({_id: req.query.id, "state.status": { $ne: Device.STATUS.DELETED } }).lean().exec().then(function(device) {
    if (!device) {
      res.status(400).send({error: "No device found!"});
    }

    // Search data from 2 minutes ago
    let upperInterval = new Date();
    upperInterval.setMinutes(upperInterval.getMinutes()-0.10);

    let lowerInterval = new Date();
    lowerInterval.setMinutes(lowerInterval.getMinutes()-2);

    DeviceData.find({
      deviceId: device._id,
      date: {
        $gte: lowerInterval,
        $lte: upperInterval
      }
    }).lean().exec().then(function(deviceData) {
      if (deviceData) {
        device.pastData = deviceData;
      } else {
        device.pastData = [];
      }
      res.status(200).send({device: device});
    });

  });

};

exports.deviceMostRecentData = function(req, res) {

  if (!req.query.id) {
    return res.status(400).send({error: "No device id sent!"});
  }

  Device.findOne({_id: req.query.id, "state.status": { $ne: Device.STATUS.DELETED } }).lean().exec().then(function(device) {
    if (!device) {
      res.status(400).send({error: "No device found!"});
    }

    // Search data from 5 seconds ago
    let interval = new Date();
    interval.setMinutes(interval.getMinutes()-0.05);

    DeviceData.findOne({
      deviceId: device._id,
      date: {$gte: interval}
    }).lean().exec().then(function(deviceData) {
      if (!deviceData) {
        deviceData = {};
        return res.status(422).send({error: "No recent data!"});
      }
      return res.status(200).send({deviceMostRecentData: deviceData});
    });

  });

};

exports.changeDeviceStatus = function(req, res) {

  if (!req.body.deviceId) {
    return res.status(400).send({error: "No device id sent!"});
  }

  Device.findOne({_id: req.body.deviceId, "state.status": { $ne: Device.STATUS.DELETED } }).exec().then(function(device) {

    if (!device) {
      return res.status(400).send({error: "No device found!"});
    }
    if (String(device.userId) !== String(req.user._id)) {
      return res.status(400).send({error: "This device is not yours"});
    }

    const status = req.body.status;

    if (status !== Device.STATUS.ACTIVE &&
        status !== Device.STATUS.INACTIVE &&
        status !== Device.STATUS.DELETED) {
      return res.status(400).send({error: "Not a valid status change"});
    }

    device.state.status = status;

    device.save().then(function(device) {
      return res.status(200).send({device: device});
    }).fail(function(error) {
      return res.status(422).send({error: error.errors});
    });

  });

};


exports.changeDeviceName = function(req, res) {

  if (!req.body.deviceId) {
    return res.status(400).send({error: "No device id sent!"});
  }

  Device.findOne({_id: req.body.deviceId, "state.status": { $ne: Device.STATUS.DELETED } }).exec().then(function(device) {

    if (!device) {
      return res.status(400).send({error: "No device found!"});
    }
    if (String(device.userId) !== String(req.user._id)) {
      return res.status(400).send({error: "This device is not yours"});
    }

    const deviceName = req.body.deviceName;

    if (deviceName === "" || !deviceName) {
      return res.status(400).send({error: "Device name is invalid!"});
    }

    device.photonName = deviceName;

    device.save().then(function(device) {
      return res.status(200).send({device: device});
    }).fail(function(error) {
      return res.status(422).send({error: error.errors});
    });

  });

};

exports.particleOAuth = function(req, res) {

    let requestObj = request.defaults({
      baseUrl: req.body.apiUrl,
    });

    requestObj({
      uri: '/oauth/token',
      method: 'POST',
      form: {
        username: "smartpowersocket@gmail.com",
        password: "smartpowersocket2016***",
        grant_type: 'password',
        client_id: req.body.client_id,
        client_secret: 'client_secret_here'
      },
      json: true
    }, function (error, response, body) {

      if (error) {
        return res.status(422).send(error);
      }
      if (body.error) {
        return res.status(422).send(body.error_description);
      } else {
        return res.status(200).send(body);
      }
    });

};
