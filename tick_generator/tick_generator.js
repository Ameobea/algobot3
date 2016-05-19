"use strict";
/*
Tick Generator

Parses incoming ticks from any source (backtest or live data feed).
It then stores them in the database as well as sending them to any
other modules that need them.
*/

var redis = require("redis");
var uuid64 = require("uuid64");

var conf = require("../conf/conf");
var dbUtil = require("../db_utils/utils");
var sma = require("../algos/average/sma");
var nostoreCore = require("../algo_core/nostore_core");
var backtest = require("../backtest/backtest");

var tickGenerator = exports;

//TODO: Make it so that it only stores a tick once the previous tick
//has finished being stored.
var redisListenClient = redis.createClient();
var redisPublishClient = redis.createClient();

var prevTick = {}; //last tick from previous average period
var storeQueue = {}; //stores ticks waiting to be processed&stored

tickGenerator.listen = (pairs, id)=>{
  dbUtil.mongoConnect(db=>{
    if(!id){
      id = uuid64();
    }

    db.collection("instances").insertOne({type: "tickParser", id: id, pairs: pairs});

    redisListenClient.subscribe("ticks");
    redisListenClient.subscribe("instanceCommands");

    var tick;
    redisListenClient.on("message", (channel, message)=>{
      if(channel == "ticks"){
        tick = JSON.parse(message);

        if(pairs == "ALL" || (pairs && pairs.indexOf(tick.pair.toLowerCase()) != -1)){
          tickGenerator.processTick(tick, db);
        }
      }else if(channel == "instanceCommands"){
        var parsed = JSON.parse(message);

        if(parsed.command){
          if(parsed.command == "kill" && parsed.id == id){
            redisPublishClient.publish("instanceCommands", JSON.stringify({status: "dying", id: id}));
            process.exit(0);
          }else if(parsed.command == "ping"){
            redisPublishClient.publish("instanceCommands", JSON.stringify({status: "alive", id: id}));
          }
        }
      }
    });
  });
};

tickGenerator.processTick = (tick, db)=>{
  if(!prevTick.timestamp || prevTick.timestamp < tick.timestamp){ //only allow sane ticks through.
    if(conf.public.storeRawTicks && conf.public.backtestType != "nostore"){
      tickGenerator.storeTick(tick.pair, tick.timestamp, tick.bid, tick.ask, db, ()=>{});
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
        tickGenerator.calcPeriodAverage(storeQueue[tick.pair], tick.timestamp, redisPublishClient, db, (average, prev)=>{
          prevTick[tick.pair] = prev;
          storeQueue[tick.pair] = [];
        });
      }else{
        if(conf.public.backtestType == "nostore"){
          backtest.nostoreNext();
        }
      }
    }
  }
}

tickGenerator.calcPeriodAverage = (ticks, curTime, redisClient, db, callback)=>{
  if(ticks.length > 0){
    sma.rawCalc(ticks, curTime-1000, curTime, true, periodAverage=>{
      tickGenerator.storePeriodAverage(ticks[0].pair, curTime, periodAverage, db, ()=>{
        var publishObject = {pair: ticks[0].pair, timestamp: curTime, price: periodAverage};
        if(conf.public.backtestType != "nostore"){
          redisClient.publish("prices", JSON.stringify(publishObject));
        }else{
          //console.log("Sending tick to core manually");
          nostoreCore.processUpdate(publishObject, db).then(()=>{
            backtest.nostoreNext();
          }, ()=>{ //didn't process fully
            backtest.nostoreNext();
          });
        }
        callback(periodAverage, ticks[ticks.length-1]);
      });
    });
  }else{
    return false;
  }
};

tickGenerator.storePeriodAverage = (pair, timestamp, secondAverage, db, callback)=>{
  if(conf.public.backtestType != "nostore"){
    var pricesCollection = db.collection("prices");
    var doc = {pair: pair, timestamp: timestamp, price: secondAverage};
    pricesCollection.insertOne(doc, (res)=>{
      callback();
    });
  }else{
    callback();
  }
};

tickGenerator.storeTick = (pair, timestamp, bid, ask, db, callback)=>{
  var ticksCollection = db.collection("ticks");
  var doc = {pair: pair, timestamp: timestamp, bid: bid, ask: ask};
  ticksCollection.insertOne(doc, (res)=>{
    callback();
  });
}
