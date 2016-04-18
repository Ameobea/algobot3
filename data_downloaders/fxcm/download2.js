/*jslint node: true */
"use strict";
/*
FXCM Historical Data Downloader

Using the FXCM Broker API, this utility pulls down historical ticks from their trade servers
in conjunction with the tick_recorder java application which serves as the link to their API.

Requests are made to that application over redis which are then procesed, sent to the FXCM servers,
and sent back as a redis reply.  

This method is faster than the original but also can produce un-sorted ticks.  In order to fix this,
use the instructions in the readme to 
*/
var redis = require("redis"); //TODO: Intelligently skip weekends
var fs = require("fs");
var uuid64 = require("uuid64");

var conf = require("../../conf/conf");

//unix timestamp format.
var pair = "usdcad"; //like "usdcad"
var startTime = 1451887200 * 1000; //like 1393826400 * 1000
var endTime = 1459531254 * 1000;

//time between data requests
var downloadDelay = 50;

//0 = no logging, 1 = error logging, 2 = log EVERYTHING
var logLevel = 2;

//number of 10-second chunks queued up (almost) simultaneously
var superChunkSize = 50;

var redisPubclient = redis.createClient();
var redisSubClient = redis.createClient();
redisSubClient.subscribe("historicalPrices"); 

var requestQueue; // holds uuids of sent requests
var downloadQueue; // holds ids of downloading segments

redisSubClient.on("message", (channel, message)=>{
  if(logLevel == 2){
    console.log("getting: " + message);
  }
  var parsed = JSON.parse(message);

  if(parsed.error && parsed.error == "No ticks in range"){ //no ticks in range
    downloadQueue.push(parsed.uuid);
  }else if(parsed.status && parsed.status == ">300 data"){ //there were more than 300 ticks in the 10-second range
    //TODO: Handle >300 ticks
    if(logLevel >= 1){
      console.log("Error - more than 300 ticks in that 10-second time range.");
    }
  }else if(parsed.type && parsed.type == "segmentID"){ // segment request recieved and download started
    downloadQueue.push(parsed.uuid);
  }else if(parsed.type && parsed.type == "segment"){// new segment
    parsed.data.forEach(tick=>{
      storeTick(tick);
    });
  }
});

var formatPair = rawPair=>{
  var currencyOne = rawPair.toUpperCase().substring(0,3);
  var currencyTwo = rawPair.toUpperCase().substring(3,6);
  return currencyOne + "/" +  currencyTwo;
};

//Starts the download of a 10-second segment of ticks.
var downloadSegment = startTime=>{
  var uuid = uuid64();
  console.log(uuid);

  var toSend = [{uuid: uuid, pair: formatPair(pair), startTime: startTime, endTime: startTime + 10000, resolution: "t1"}];
  requestQueue.push(toSend);

  redisPubclient.publish("priceRequests", JSON.stringify(toSend));
};


//This queues up a ton of 10-second chunks to download semi-asynchronously.
var downloadSuperSegment = startTime=>{
  requestQueue = [];
  downloadQueue = []; //reset the queues for this segment

  for(var i=0;i<superChunkSize;i++){
    setTimeout(()=>{
      downloadSegment(startTime);
    }, i*downloadDelay)

    startTime = startTime + 10000;
  }

  verifyDownload().then(()=>{
    downloadSuperSegment(startTime);
  });
};

var doSuperDownload = (startTime, i)=>{
  if(i < superChunkSize){
    downloadSegment(startTime);
    setTimeout(()=>{
      doSuperDownload(startTime + 10000, i+1);
    }, downloadDelay);
  }else{
    return startTime;
  }
};

var verifyDownload = ()=>{
  console.log("verifying");
  return new Promise((f,r)=>{
    setTimeout(()=>{
      downloadWaiter().then(res=>{
        if(res){
          f();
        }else{
          verifyDownload(); //wait another 2 seconds and check if it worked.
        }
      });
    }, 2016);
  });
};

var downloadWaiter = ()=>{
  return new Promise((f,r)=>{
    let misses = 0;

    requestQueue.forEach(req=>{
      if(downloadQueue.indexOf(req.uuid) == -1){
        console.log("resending " + JSON.stringify(req));
        redisPubclient.publish("priceRequests", JSON.stringify(req));
      }
    });

    if(misses != 0){
      f(false);
    }else{
      f(true);
    }
  });
};

var existingFiles = {};
var toAppend;

var storeTick = (tick)=>{
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
    toAppend = "\n" + tick.timestamp + ", " + tick.bid + ", " + tick.ask;
    fs.appendFile(conf.private.tickRecorderOutputPath + pair + ".csv", toAppend, (err, res)=>{});
  });
};

var initFile = (pair, callback)=>{
  fs.writeFile(conf.private.tickRecorderOutputPath + pair + ".csv", "timestamp, bid, ask", (err, res)=>{
    callback();
  });
};

downloadSuperSegment(startTime); //initiate segment downloading
