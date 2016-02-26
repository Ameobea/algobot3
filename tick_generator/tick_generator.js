/*
Tick Generator

Parses incoming ticks from any source (backtest or live data feed).
It then stores them in the database as well as sending them to any
other modules that need them.  
*/

var redis = require("redis");
var mongodb = require("mongodb");
var async = require("async");

var conf = require("../conf/conf");
var dbUtil = require("../db_utils/utils");
var sma = require("../algos/average/sma");

var tickGenerator = exports;

//TODO: Make it so that it only stores a tick once the previous tick
//has finished being stored.
tickGenerator.listen = function(){
  dbUtil.mongoConnect(function(db){

    var redisListenClient = redis.createClient();
    var redisPublishClient = redis.createClient();

    var prevTick; //last tick from previous average period
    var storeQueue = []; //stores ticks waiting to be processed&stored

    redisListenClient.subscribe("ticks");

    redisListenClient.on("message", function(channel, message){
      var tick = JSON.parse(message);
      tick.price = (tick.bid+tick.ask)/2;
      if(!prevTick){
        prevTick = tick;
      }
      storeQueue.push(tick);tick.timestamp > prevTick.timestamp+conf.public.priceResolution
      if(tick.timestamp > prevTick.timestamp+conf.public.priceResolution){ // it's time to calculate an average price
        storeQueue.unshift(prevTick);
        tickGenerator.calcPeriodAverage(storeQueue, tick.timestamp, redisPublishClient, db, function(average, prev){
          prevTick = prev;
          storeQueue = [];
        });
      }
    });
  });
}

tickGenerator.calcPeriodAverage = function(ticks, curTime, redisClient, mongoClient, callback){
  if(ticks.length > 0){
    sma.rawCalc(ticks, curTime-1000, curTime, true, function(periodAverage){
      tickGenerator.storePeriodAverage(ticks[0].pair, curTime, periodAverage, mongoClient, function(){
        var publishObject = {pair: ticks[0].pair, timestamp: curTime, price: periodAverage};
        redisClient.publish("prices", JSON.stringify(publishObject));
        callback(periodAverage, ticks[ticks.length-1]);
      });
    });
  }else{
    return false;
  }
}

tickGenerator.storePeriodAverage = function(pair, timestamp, secondAverage, db, callback){
  var pricesCollection = db.collection("prices");
  pricesCollection.insertOne({pair: pair, timestamp: timestamp, price: secondAverage}, function(res){
    callback();
  })
}
