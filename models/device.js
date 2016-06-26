"use strict";

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define our model
const deviceSchema = new Schema({
	claimDate: { type: Date, default: Date.now },
	userId: { type: Schema.ObjectId },
	photonId: { type: String },
	photonName: { type: String },
	apiKey: { type: String },
	state: {
		status: String
	}
});

deviceSchema.statics.STATUS = {
	ACTIVE: 'Active',
	INACTIVE: 'Inactive',
	DELETED: 'Deleted'
};

// Create the model class
const ModelClass = mongoose.model('device', deviceSchema);

// Export the model
module.exports = ModelClass;
