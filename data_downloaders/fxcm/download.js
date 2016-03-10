/*jslint node: true */
"use strict";
/*
FXCM Historical Data Downloader

Using the FXCM Broker API, this utility pulls down historical ticks from their trade servers
in conjunction with the tick_recorder java application which serves as the link to their API.

Requests are made to that application over redis which are then procesed, sent to the FXCM servers,
and sent back as a redis reply.  
*/
var redis = require("redis");
var fs = require("fs");

var conf = require("../../conf/conf");

//unix timestamp format.
var pair = "usdcad"; //like "usdcad"
var startTime = 1451982555746; //like 1393826400 * 1000
var endTime = 1457244000 * 1000;

//time between data requests
var downloadDelay = 50;

var redisPubclient = redis.createClient();
var redisSubClient = redis.createClient();
redisSubClient.subscribe("historicalPrices");

var lastTick = {timestamp: startTime};
var lastTriedEndPrice;

redisSubClient.on("message", function(channel, message){
  var parsed = JSON.parse(message);

  if(parsed.error){
    setTimeout(function(){
      //here's to assuming there won't be a period where there are never more than 300 ticks in a 10-second period
      downloadData(lastTriedEndPrice, lastTriedEndPrice + 10000);
    }, downloadDelay);
  }else{//TODO: Make thing in java code that sends a message meaning that more than 300 ticks were sent and handle it here.
    if(parsed.status && parsed.status == "segmentDone"){
      setTimeout(function(){
        downloadData(lastTriedEndPrice, lastTriedEndPrice + 10000);
      }, downloadDelay);
    }else{
      if(lastTick && lastTick.timestamp < parsed.timestamp){
        if(parsed.timestamp < endTime){
          lastTick = parsed;
          storeTick(parsed);
        }else{
          console.log("All ticks in range stored.");
          process.exit(0);
        } 
      }else if(!lastTick){
        lastTick = parsed;
      }else{
        //we got bullshit data not actually in the range because the api is horrible
      }
    }
  }
});

var downloadData = function(start, end){
  lastTriedEndPrice = end;
  //JSON format should be this: "{Pair: "USD/CAD", startTime: 1457300020.23, endTime: 1457300025.57, resolution: t1}"
  var toSend = [{pair: formatPair(pair), startTime: start + 1, endTime: end, resolution: "t1"}];
  redisPubclient.publish("priceRequests", JSON.stringify(toSend));
};

var initFile = function(pair, callback){
  fs.writeFile(conf.private.tickRecorderOutputPath + pair + ".csv", "timestamp, bid, ask", function(err, res){
    callback();
  });
};

var existingFiles = {};
var toAppend;

var storeTick = function(tick){
  new Promise(function(fulfill, reject){
    if(!existingFiles[pair]){
      fs.stat(conf.private.tickRecorderOutputPath + pair + ".csv", function(err, res){
        if(err){
          initFile(pair, function(){
            existingFiles[pair] = true;
            fulfill();
          });
        }else{
          existingFiles[pair] = true;
          fulfill();
        }
      })
    }else{
      fulfill();
    }
  }).then(function(){
    toAppend = "\n" + tick.timestamp + ", " + tick.bid + ", " + tick.ask;
    fs.appendFile(conf.private.tickRecorderOutputPath + pair + ".csv", toAppend, function(err, res){})
  });
};

var formatPair = function(rawPair){
  var currencyOne = rawPair.toUpperCase().substring(0,3);
  var currencyTwo = rawPair.toUpperCase().substring(3,6);
  return currencyOne + "/" +  currencyTwo;
};

downloadData(startTime, startTime + 10000);
