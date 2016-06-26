// Main starting point of the application
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser'); // parse requests to JSON
const morgan = require('morgan'); // log-in incoming requests framework
const app = express();
const router = require('./router');
const mongoose = require('mongoose');
const cors = require('cors');

// DB Setup
mongoose.Promise = require('q').Promise;

if (env.NODE_ENV !== "production") {
	mongoose.connect('mongodb://localhost:auth/smartpowersocket');
} else {
	mongoose.connect('mongodb://$OPENSHIFT_MONGODB_DB_HOST:$OPENSHIFT_MONGODB_DB_PORT/api');
}

// App Setup - middleware
app.use(morgan('combined'));
app.use(cors()); // accept all requests
app.use(bodyParser.json({ type: '*/*' }));
router(app);

// npm install --save nodemon
// nodemon check for changes on the api files and restarts
// automaticaly

// Server Setup
const server = http.createServer(app);
server.listen(env.NODE_PORT || 3000, env.NODE_IP || 'localhost', function () {
  console.log(`Application worker ${process.pid} started...`);
});
