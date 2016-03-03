"use strict";
/*jslint node: true */

var express = require('express');
var path = require("path");
var bodyParser = require('body-parser');
var ws = require('nodejs-websocket');
var redis = require("redis");

var conf = require("../conf/conf");

var manager = exports;

manager.start = function(port){
  var app = express();

  var index = require('./routes/index');
  var api = require("./routes/api");

  app.engine('html', require('ejs').renderFile);
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));
  app.listen(port);
  console.log("Manager webserver started!");

  app.use('/', index);
  app.use("/api", api);

  var socket_server = ws.createServer(function(conn){
    socket_server.on('error', function(err){
      console.log(err);
    });
    conn.on('text', function(input){
      socket_server.connections.forEach(function(connection){
        connection.sendText(input);
      });
    });
  }).listen(3596);

  var redisClient = redis.createClient();
  redisClient.subscribe("ticks");
  redisClient.subscribe("prices");
  redisClient.subscribe("smas");
  redisClient.subscribe("momentums");

  redisClient.on("message", function(channel, message){
    socket_server.connections.forEach(function(conn){
      conn.sendText(message);
    });
  });

  // development error handler
  // will print stacktrace
  if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
      res.status(err.status || 500);
      console.log(err.stack);
      res.render('error', {
        message: err.message,
        error: err
      });
    });
  }

  // production error handler
  // no stacktraces leaked to user
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: {}
    });
  });

  app.use(function(req, res, next) {
    res.status(404).send('Resource not found');
  });
};
