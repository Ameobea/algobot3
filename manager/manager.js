"use strict";
/*jslint node: true */

var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var http = require("http");
var ws = require("nodejs-websocket");
var redis = require("redis");

var conf = require("../conf/conf");
var dbUtils = require("../db_utils/utils");

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

  var socketServer = ws.createServer(function(conn){
    socketServer.on('error', function(err){
      console.log(`Websocket server had some sort of error: ${err}`);
    });

    conn.on('text', function(input){ //broadcast to all
      socketServer.connections.forEach(function(connection){
        connection.sendText(input);
      });
    });

    conn.on('close',function(code,reason){
      console.log('Websocket connection closed');
    });
  }).listen(parseInt(conf.private.websocketPort));

  var redisClient = redis.createClient();
  redisClient.subscribe("tickParserOutput");
  redisClient.on("message", (channel, message)=>{
    socketServer.connections.forEach(conn=>{
      conn.sendText(JSON.stringify({channel: channel, data: message}));
    });
  });

  dbUtils.mongoConnect(db=>{
    var collection = db.collection("instances");

    collection.find({type: "manager"}).toArray().then(docs=>{

      if(docs.length > 0){
        var toPing = [];
        var toDelete = [];

        docs.forEach(doc=>{
          if(doc.port != port){ // we'd be crashed already if one was running on our port.
            toPing.push(pingManager(conf.private.managerIp, doc.port));
          }else{
            collection.deleteOne({port: doc.port}); // delete ones that are left over
          }
        });

        Promise.all(toPing).then(res=>{
          var offline = res.filter(server=>{
            return !server.online;
          });

          offline.forEach(server=>{
            toDelete.push(collection.deleteOne({port: server.port}));
          });

          if(offline.length != res.length){ //at least one online server
            console.log("WARNING: Manager server already running!");
          }

          return toDelete;
        }).then(toDelete=>{
          var doc = {type: "manager", port: port};

          Promise.all(toDelete + [collection.insertOne(doc)]).then(()=>{
            //db.close(); screw this it's not worth my effort.
          }, err=>{console.log(err);});
        });
      }else{
        collection.insertOne({type: "manager", port: port}).then(()=>{
          db.close();
        });
      }
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

var pingManager = (ip, port)=>{
  return new Promise((f,r)=>{
    http.get({host: ip, port: port, path: "/api/ping"}, res=>{
      f({port: port, online: true});
    }).on("error", err=>{
      f({port: port, online: false}); //I'd love to r() here, but that breaks Promise.all().
    });
  });
};
