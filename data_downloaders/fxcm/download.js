/*jslint node: true */
"use strict";
/*
FXCM Historical Data Downloader

Using the FXCM Broker API, this utility pulls down historical ticks from their trade servers
in conjunction with the tick_recorder java application which serves as the link to their API.

Requests are made to that application over redis which are then procesed, sent to the FXCM servers,
and sent back as a redis reply.  
*/
var redis = require("redis"); //TODO: Intelligently skip weekends
var fs = require("fs");

var conf = require("../../conf/conf");

//unix timestamp format.
var pair = "usdcad"; //like "usdcad"
var startTime = 1457572877950; //like 1393826400 * 1000
var endTime = 1459531254 * 1000;

//time between data requests
var downloadDelay = 1;

var redisPubclient = redis.createClient();
var redisSubClient = redis.createClient();
redisSubClient.subscribe("historicalPrices");

var lastTick = {timestamp: startTime};
var lastTriedEndPrice = startTime + 10000;
var lastChunkIDs = [];
var curStart;
var curEnd;

redisSubClient.on("message", (channel, message)=>{
  //console.log(message);
  var parsed = JSON.parse(message);

  if(parsed.error && parsed.error == "No ticks in range"){
    setTimeout(()=>{
      lastChunkIDs.push(parsed.id);
      downloadData(lastTriedEndPrice, lastTriedEndPrice + 10000);
    }, downloadDelay);
  }else if(parsed.status && parsed.status == ">300 data"){ //there were more than 300 ticks in the 10-second range
    //TODO: Handle >300 ticks
  }else if(parsed.type && parsed.type == "segmentID"){
    responseWaiterCaller(parsed.id);
    //console.log("New chunk id: " + parsed.id);
  }else if(parsed.type && parsed.type == "segment"){// new segment    
    lastChunkIDs.push(parsed.id);
    if(lastChunkIDs.length > 5000){
      lastChunkIDs.shift()
    }

    parsed.data.forEach(tick=>{
      storeTick(tick);
    });

    setTimeout(()=>{
      downloadData(lastTriedEndPrice, lastTriedEndPrice + 10000);
    }, downloadDelay);
  }
});

//if no reply from server in 1.5 seconds, assume it's not coming and start over.
var responseWaiter = chunkID=>{
  if(lastChunkIDs.indexOf(chunkID) == -1){ //if we haven't recieved a tick from the current segment yet
    console.log(chunkID + " not in array; Resending data request...");
    downloadData(curStart, curEnd); //re-send request for that segment
  }
};

var responseWaiterCaller = oldID=>{
  setTimeout(()=>{
    responseWaiter(oldID);
  }, 25000);
};

var downloadData = (start, end)=>{
  curStart = start;
  curEnd = end;
  lastTriedEndPrice = end;
  //JSON format should be this: "{Pair: "USD/CAD", startTime: 1457300020.23, endTime: 1457300025.57, resolution: t1}"
  var toSend = [{pair: formatPair(pair), startTime: start + 1, endTime: end, resolution: "t1"}];
  redisPubclient.publish("priceRequests", JSON.stringify(toSend));
};

var initFile = (pair, callback)=>{
  fs.writeFile(conf.private.tickRecorderOutputPath + pair + ".csv", "timestamp, bid, ask", (err, res)=>{
    callback();
  });
};

var existingFiles = {};
var toAppend;

var storeTick = (tick)=>{
  if(lastTick.timestamp >= tick.timestamp){ //don't store out-of-order ticks
    return;
  }

  if(tick.timestamp > endTime){
    console.log("All ticks in range downloaded and stored.");
    process.exit(0);
  }

  new Promise((fulfill, reject)=>{
    if(!existingFiles[pair]){
      fs.stat(conf.private.tickRecorderOutputPath + pair + ".csv", (err, res)=>{
        if(err){
          initFile(pair, ()=>{
            existingFiles[pair] = true;
            fulfill();
          });
        }else{
          existingFiles[pair] = true;
          fulfill();
        }
      });
    }else{
      fulfill();
    }
  }).then(()=>{
    lastTick = tick;

    toAppend = "\n" + tick.timestamp + ", " + tick.bid + ", " + tick.ask;
    fs.appendFile(conf.private.tickRecorderOutputPath + pair + ".csv", toAppend, (err, res)=>{});
  });
};

var formatPair = rawPair=>{
  var currencyOne = rawPair.toUpperCase().substring(0,3);
  var currencyTwo = rawPair.toUpperCase().substring(3,6);
  return currencyOne + "/" +  currencyTwo;
};

downloadData(startTime, startTime + 10000);
