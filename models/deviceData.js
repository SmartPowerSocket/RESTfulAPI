"use strict";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define our model
const deviceDataSchema = new Schema({
	deviceId: Schema.Types.ObjectId,
	date: { type: Date, default: Date.now, index: true },
	socketNum: Number,
	current: Number,
	tension: Number,
	apparentPower: Number
});

// Create the model class
const ModelClass = mongoose.model('deviceData', deviceDataSchema);

// Export the model
module.exports = ModelClass;