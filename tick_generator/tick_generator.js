"use strict";
/*
Tick Generator

Parses incoming ticks from any source (backtest or live data feed).
It then stores them in the database as well as sending them to any
other modules that need them.  
*/

var redis = require("redis");

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

    var prevTick = {}; //last tick from previous average period
    var storeQueue = []; //stores ticks waiting to be processed&stored

    redisListenClient.subscribe("ticks");

    var tick;
    redisListenClient.on("message", function(channel, message){
      tick = JSON.parse(message);

      if(!prevTick.timestamp || prevTick.timestamp < tick.timestamp){ //only allow sane ticks through.
        if(conf.public.storeRawTicks){
          tickGenerator.storeTick(tick.pair, tick.timestamp, tick.bid, tick.ask, db, function(){});
        }
        if(conf.public.live == tick.real){// Ignore real ticks if we're backtesting, ignore backtests if we're live
          tick.price = (tick.bid+tick.ask)/2;
          if(!prevTick[tick.pair]){
            prevTick[tick.pair] = tick;
          }
          if(!storeQueue[tick.pair]){
            storeQueue[tick.pair] = [];
          }
          storeQueue[tick.pair].push(tick);
          if(tick.timestamp > prevTick[tick.pair].timestamp+conf.public.priceResolution){ // it's time to calculate an average price
            storeQueue[tick.pair].unshift(prevTick[tick.pair]);
            tickGenerator.calcPeriodAverage(storeQueue[tick.pair], tick.timestamp, redisPublishClient, db, function(average, prev){
              prevTick[tick.pair] = prev;
              storeQueue[tick.pair] = [];
            });
          }
        }
      }
    });
  });
};

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
};

tickGenerator.storePeriodAverage = function(pair, timestamp, secondAverage, db, callback){
  var pricesCollection = db.collection("prices");
  var doc = {pair: pair, timestamp: timestamp, price: secondAverage};
  pricesCollection.insertOne(doc, function(res){
    callback();
  });
};

tickGenerator.storeTick = function(pair, timestamp, bid, ask, db, callback){
  var ticksCollection = db.collection("ticks");
  var doc = {pair: pair, timestamp: timestamp, bid: bid, ask: ask};
  ticksCollection.insertOne(doc, function(res){
    callback();
  });
}
