"use strict";

const Device = require('../models/device');
const DeviceData = require('../models/deviceData');
const request = require('request');

exports.sendSocketInformation = function(req, res) {

  const apiKey = req.body.apiKey;
  const coreid = req.body.coreid;
  const current = Number(req.body.current);
  const tension = Number(req.body.tension);
  const socketNum = Number(req.body.socketNum);

  Device.findOne({
    photonId: coreid,
    apiKey: apiKey
  }).lean().exec().then(function(device) {
    if (device) {
      const deviceData = new DeviceData({
        deviceId: device._id,
        socketNum: socketNum,
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

exports.changeSocketStatus = function(req, res) {

  const apiKey = req.body.apiKey;
  const coreid = req.body.coreid;
  const socketNum = Number(req.body.socketNum);

  Device.findOne({
    photonId: coreid,
    apiKey: apiKey
  }).exec().then(function(device) {
    if (device) {

      if (socketNum === 1 &&
          device.socket1 &&
          device.socket1.state.status) {
        if (device.socket1.state.status === Device.STATUS.INACTIVE) {
          device.socket1.state.status = Device.STATUS.ACTIVE;
        } else if (device.socket1.state.status === Device.STATUS.ACTIVE) {
          device.socket1.state.status = Device.STATUS.INACTIVE;
        }
      } else if(socketNum === 2 &&
                device.socket2 &&
                device.socket2.state.status) {
        if (device.socket2.state.status === Device.STATUS.INACTIVE) {
          device.socket2.state.status = Device.STATUS.ACTIVE;
        } else if (device.socket2.state.status === Device.STATUS.ACTIVE) {
          device.socket2.state.status = Device.STATUS.INACTIVE;
        }
      }

      device.save().then(function() {
        if (socketNum === 1) {
          return res.status(200).send({
            state: device.socket1.state,
            socketName: "Socket1"
          });
        } else  if (socketNum === 2) {
          return res.status(200).send({
            state: device.socket2.state,
            socketName: "Socket2"
          });
        }
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
    const socketNum = Number(data.socketNum);

    Device.findOne({
      photonId: coreid,
      apiKey: apiKey
    }).lean().exec().then(function(device) {
      if (device) {
        if (socketNum === 1) {
          return res.status(200).send({
            state: device.socket1.state,
            socketName: "Socket1"
          });
        } else  if (socketNum === 2) {
          return res.status(200).send({
            state: device.socket2.state,
            socketName: "Socket2"
          });
        }
      } else {
        return res.status(200).send({error: "Authentication failed!"});
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
    apiKey: req.user.apiKey,
    socket1: {
      name: "New Device - Socket 1", //req.body.deviceName,
      state: {
        status: Device.STATUS.ACTIVE
      }
    },
    socket2: {
      name: "New Device - Socket 2",
      state: {
        status: Device.STATUS.ACTIVE
      }
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

  Device.find({
    userId: req.user._id
  }).lean().exec().then(function(devices) {
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

  Device.findById(req.query.id).lean().exec().then(function(device) {
    if (!device) {
      res.status(400).send({error: "No device found!"});
    }

    // Search data from 2 minutes ago
    let upperInterval = new Date();
    upperInterval.setMinutes(upperInterval.getMinutes()-0.10);

    let lowerInterval = new Date();
    lowerInterval.setMinutes(lowerInterval.getMinutes()-5);

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

  const deviceId = req.query.deviceId;
  const socketNum = req.query.socketNum;

  if (!deviceId) {
    return res.status(400).send({error: "No device id sent!"});
  }

  if (!socketNum) {
    return res.status(400).send({error: "No socket number sent!"});
  }

  Device.findById(deviceId).lean().exec().then(function(device) {
    if (!device) {
      res.status(400).send({error: "No device found!"});
    }

    // Search data from 5 seconds ago
    let interval = new Date();
    interval.setMinutes(interval.getMinutes()-0.05);

    DeviceData.findOne({
      deviceId: device._id,
      date: {$gte: interval},
      socketNum: socketNum
    }).lean().exec().then(function(deviceData) {
      if (!deviceData) {
        return res.status(422).send({error: "No recent data!"});
      }
      return res.status(200).send({deviceMostRecentData: deviceData});
    });

  });

};

exports.changeDeviceStatus = function(req, res) {

  const deviceId = req.body.deviceId;
  const socketNum = Number(req.body.socketNum);
  const status = req.body.status;
  const userId = String(req.user._id);

  if (!deviceId) {
    return res.status(400).send({error: "No device id sent!"});
  }

  Device.findById(deviceId).exec().then(function(device) {

    if (!device) {
      return res.status(400).send({error: "No device found!"});
    }
    if (String(device.userId) !== userId) {
      return res.status(400).send({error: "This device is not yours"});
    }

    if (status !== Device.STATUS.ACTIVE &&
        status !== Device.STATUS.INACTIVE &&
        status !== Device.STATUS.DELETED) {
      return res.status(400).send({error: "Not a valid status change"});
    }

    if (socketNum === 1) {
      device.socket1.state.status = status;
    } else if (socketNum === 2) {
      device.socket2.state.status = status;
    }

    if (device.socket1.state.status === Device.STATUS.DELETED &&
        device.socket2.state.status === Device.STATUS.DELETED) {

      device.remove().then(function() {
        DeviceData.remove({
          deviceId: device._id
        }).exec().then(function() {
          return res.status(200).send({deviceRemoved: true});
        });
      }).fail(function(error) {
        return res.status(422).send({error: error.errors});
      });
    } else {

      device.save().then(function(device) {
        return res.status(200).send({device: device});
      }).fail(function(error) {
        return res.status(422).send({error: error.errors});
      });
    }

  });

};


exports.changeDeviceName = function(req, res) {

  if (!req.body.deviceId) {
    return res.status(400).send({error: "No device id sent!"});
  }

  Device.findById(req.body.deviceId).exec().then(function(device) {

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

    const socketNum = Number(req.body.socketNum);

    if (socketNum === 1) {
      device.socket1.name = deviceName;
    } else if (socketNum === 2) {
      device.socket2.name = deviceName;
    }

    device.save().then(function(device) {
      return res.status(200).send({device: device});
    }).fail(function(error) {
      return res.status(422).send({error: error.errors});
    });

  });

};

exports.generateReport = function(req, res) {

  const deviceId = req.body.deviceId;
  const socketNum = Number(req.body.socketNum);
  let startDate = new Date(req.body.startDate);
  let endDate = new Date(req.body.endDate);
  const kWReaisHour = Number(req.body.kWReaisHour);

  if (!deviceId) {
    return res.status(400).send({error: "No device id sent!"});
  }

  if (!socketNum) {
    return res.status(400).send({error: "No socket number sent!"});
  }

  if (!startDate) {
    return res.status(400).send({error: "No start date sent!"});
  }

  if (!endDate) {
    return res.status(400).send({error: "No end date sent!"});
  }

  if (!kWReaisHour) {
    return res.status(400).send({error: "No kVA reais hour sent!"});
  }

  Device.findById(deviceId).lean().exec().then(function(device) {
    if (!device) {
      res.status(400).send({error: "No device found!"});
    }

    DeviceData.find({
      deviceId: device._id,
      date: {
        $gte: startDate,
        $lte: endDate
      },
      socketNum: socketNum
    }).lean().exec().then(function(devicesData) {

      let consumptionkW = 0;
      let consumptionReais = 0;

      if (devicesData && devicesData.length > 0) {
        let lastMinute = null;
        let currentMinute = null;
        let totalConsumptionKW = 0;
        let totalConsumptionReais = 0;
        let lastMinuteConsumption = 0;
        let countRepetitiveMinutes = 0;
        let countUniqueMinutes = 0;

        devicesData.forEach(function(deviceData) {

          currentMinute = deviceData.date.getMinutes();
          if (currentMinute === lastMinute) {
            countRepetitiveMinutes += 1;
            lastMinuteConsumption += deviceData.apparentPower;
          } else {
            if (lastMinuteConsumption > 0 && countRepetitiveMinutes > 0) {
              totalConsumptionKW += (lastMinuteConsumption / countRepetitiveMinutes) / 1000;
            }
            lastMinute = currentMinute;
            countUniqueMinutes += 1;
            countRepetitiveMinutes = 1;
            lastMinuteConsumption = deviceData.apparentPower;
          }
        });

        if (totalConsumptionKW > 0 && countUniqueMinutes > 0) {
          consumptionReais = (totalConsumptionKW * (countUniqueMinutes/60)) * kWReaisHour;
          consumptionkW = totalConsumptionKW;
        }
      }

      return res.status(200).send({
        report: {
          socketNum: socketNum,
          data: {
            consumptionkW: consumptionkW.toFixed(2),
            consumptionReais: consumptionReais.toFixed(2)
          }
        }
      });

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
        username: process.env.PARTICLE_USER_EMAIL,// Test user: "smartpowersocket@gmail.com",
        password: process.env.PARTICLE_USER_PASSWORD, // Test pw: "smartpowersocket2016***",
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
