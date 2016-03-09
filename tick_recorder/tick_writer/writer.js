/*jslint node: true */
"use strict";
/*
Tick Writer

Listens for new, live, real ticks on redis and records them to flatfile storage for backtesting etc.
*/
var redis = require("redis");
var fs = require("fs");

var conf = require("../../conf/conf");

var redisClient = redis.createClient();
redisClient.subscribe("ticks");

var initFile = function(pair, callback){
  fs.writeFile(conf.private.tickWriterOutputPath + pair + ".csv", "timestamp, bid, ask", function(err, res){
    callback();
  });
};

var existingFiles = {};

var parsed;
redisClient.on("message", function(channel, message){
  parsed = JSON.parse(message);

  if(parsed.real){
    new Promise(function(fulfill, reject){
      if(!existingFiles[parsed.pair]){
        fs.stat(conf.private.tickWriterOutputPath + parsed.pair + ".csv", function(err, stat){
          if(err){
            initFile(parsed.pair, function(){
              existingFiles[parsed.pair] = true;
              fulfill();
            });
          }else{
            existingFiles[parsed.pair] = true;
            fulfill();
          }
        });
      }else{
        fulfill();
      }
    }).then(function(){
      var appendString = "\n" + parsed.timestamp.toString() + ", " + parsed.bid.toString() + ", " + parsed.ask.toString();
      fs.appendFile(conf.private.tickWriterOutputPath + parsed.pair + ".csv", appendString, function(err, res){});
    });
  }
});
