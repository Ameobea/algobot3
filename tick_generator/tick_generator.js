/*
Tick Generator

Parses incoming ticks from any source (backtest or live data feed).
It then stores them in the database as well as sending them to any
other modules that need them.  
*/

var redis = require("redis");
var mongodb = require("mongodb");
var conf = require("../conf/conf");
var dbUtil = require("../db_utils/utils");

var tickGenerator = exports;

//TODO: Make it so that it only stores a tick once the previous tick
//has finished being stored.
tickGenerator.listen = function(){
  dbUtil.mongoConnect(function(db){
    var redisListenClient = redis.createClient();
    var redisPublishClient = redis.createClient();
    redisListenClient.subscribe("ticks");

    redisListenClient.on("message", function(channel, message){
      var tick = JSON.parse(message);
      if(tick.stored == false){
        tickGenerator.storeTick(tick, db, function(){
          tick.stored = true;
          redisPublishClient.publish("ticks", JSON.stringify(tick));
        });
      }
    });
  });
}

tickGenerator.storeTick = function(tick, db, callback){
  var ticks = db.collection('ticks');
  ticks.insertOne(tick, function(err, res){callback()});
}
