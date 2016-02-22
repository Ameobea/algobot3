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

tickGenerator.listen = function(){
  dbUtil.mongoConnect(function(db){
    var client = redis.createClient();
    client.subscribe("ticks");

    client.on("message", function(channel, message){
      var tick = JSON.parse(message);
      tickGenerator.store_tick(tick, db);
    });
  });
}

tickGenerator.store_tick = function(tick, db){
  var ticks = db.collection('ticks');
  ticks.insertOne(tick, function(err, res){});
}
