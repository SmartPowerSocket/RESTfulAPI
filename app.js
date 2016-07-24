"use strict";

// Main starting point of the application
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser'); // parse requests to JSON
const morgan = require('morgan'); // log-in incoming requests framework
const app = express();
const router = require('./router');
const mongoose = require('mongoose');
const cors = require('cors');
const env = process.env;

// create a write stream (in append mode)
var accessLogStream = fs.createWriteStream(__dirname + '/access.log',{flags: 'a'});

// DB Setup
mongoose.Promise = require('q').Promise;

if (env.NODE_ENV !== "production") {
	mongoose.connect('mongodb://localhost:auth/smartpowersocket');
} else {
	mongoose.connect('mongodb://admin:TlHr2YZHWSGg@127.12.161.2:27017/api');
	// mongoose.connect('mongodb://admin:TlHr2YZHWSGg@$OPENSHIFT_MONGODB_DB_HOST:$OPENSHIFT_MONGODB_DB_PORT/api');
}

// App Setup - middleware
app.use(morgan('combined', {stream: accessLogStream}));
app.use(cors()); // accept all requests
app.use(bodyParser.json({ type: '*/*' }));
router(app);

// npm install --save nodemon
// nodemon check for changes on the api files and restarts
// automaticaly

const nodePort = env.NODE_PORT || 3000;
const nodeIp = env.NODE_IP || 'localhost';

// Server Setup
const server = http.createServer(app);
server.listen(nodePort, nodeIp, function () {
  console.log(`Application worker ${process.pid} started...`);
  console.log(`IP: ${nodeIp} PORT: ${nodePort}`);
});
