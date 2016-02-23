/*
Algorithm Core Module

This is the 'brain' of the bot.  It keeps track of all the other
modules and determines what calculations are made.  It recieves a processed
feed of data from live sources and makes requests to other modules and the
database in order to determine trading conditions.
*/
var redis = require("redis");
var conf = require("../conf/conf");
var sma = require("../algos/average/sma");

var core = exports;

core.start = function(){
  var redisClient = redis.createClient();
  redisClient.subscribe("ticks");

  redisClient.on("message", function(channel, message){
    var tick = JSON.parse(message);
    if(tick.stored == true){
      core.calcAverages(tick);
    }
  });
}

//TODO: Make sure that this only gets called once the newest tick is stored in the database
core.calcAverages = function(tick){
    sma.calc(tick.pair, tick.timestamp-20, tick.timestamp, conf.public.accurateSMA, function(average){
      console.log(average);
    });
}
