/*jslint node: true */
"use strict";
/*
Backtest

Contains functions to initiate and manage backtests.  They read data
out of the flatfile tick data storage files in conf.public.tickDataDirectory
and send them to the Tick Generator.
*/

var fs = require('fs');
var conf = require("../conf/conf");
var redis = require("redis");
var dbUtil = require("../db_utils/utils");

var backtest = exports;

backtest.checkIfRunning = function(pair, callback){
  dbUtil.mongoConnect(function(db){
    var flags = db.collection("backtestFlags");
    flags.find({status: "running", pair: pair}).toArray(function(err, docs){
      db.close();
      if(docs.length > 0){
        db.close();
        callback(true);
      }else{
        db.close();
        callback(false);
      }
    });
  });
};

backtest.clearFlags = function(callback){
  dbUtil.mongoConnect(function(db){
    var flags = db.collection("backtestFlags");
    flags.drop(function(err, res){
      db.close();
      callback();
    });
  });
};

backtest.setRunningFlag = function(pair, callback){
  dbUtil.mongoConnect(function(db){
    var flags = db.collection("backtestFlags");
    flags.insertOne({status: "running", pair: pair}, function(err, res){
      db.close();
      callback();
    });
  });
};

backtest.live = function(pair, startTime){
  backtest.checkIfRunning(pair, function(running){
    if(!running){
      backtest.setRunningFlag(pair, function(){
        var redisClient = redis.createClient();
        
        fs.readFile(conf.public.tickDataDirectory + pair.toUpperCase() + '/index.csv', {encoding: 'utf8'}, 'r', function(err,data){
          var result = [];
          var indexData = data.split('\n');
          for(var i=1;i<indexData.length;i++){
            if(indexData[i].length > 3){
              var temp = indexData[i].split(',');
              temp[1] *= conf.public.backtestTimestampMultiplier;
              temp[2] *= conf.public.backtestTimestampMultiplier;
              result.push(temp);
            }
          }
          for(var i=0;i<result.length;i++){
            if(parseFloat(result[i][2]) > startTime){
              var chunk = parseFloat(result[i][0]);
              break;
            }
          }
          backtest.readTickFile(pair, chunk, function(err, data){
            var chunkResult = [];
            var chunkData = data.split('\n');
            for(var i=1;i<chunkData.length;i++){
              if(chunkData[i].length > 3){
                var temp = chunkData[i].split(',');
                temp[0] *= conf.public.backtestTimestampMultiplier;
                chunkResult.push(temp);
              }
            }
            var curIndex;
            for(var i=0;i<chunkResult.length;i++){
              if(parseFloat(chunkResult[i][0]) > startTime){
                curIndex = i-1;
                break;
              }
            }
            backtest.liveSend(chunk, chunkResult, curIndex, 0, parseFloat(chunkResult[curIndex][0]), pair, redisClient);
            return "Backtest started successfully.";
          });
        });
      });
    }else{
      return "Backtest already running for symbol " + pair;
    }
  });
};

backtest.liveSend = function(chunk, chunkResult, curIndex, diff, oldTime, pair, client){
  if(curIndex >= chunkResult.length){
    backtest.stopOne(pair, function(){
      backtest.live(pair, oldTime + 1);
    });
    return;
  }else{
    diff = (parseFloat(chunkResult[curIndex+1][0]) - parseFloat(chunkResult[curIndex][0]))*1000;
  }
  if(curIndex % conf.public.liveBacktestCheckInterval === 0){ //if this is a check interval
    backtest.checkIfRunning(pair, function(running){ 
      if(!running){ //and it's been cancelled
        console.log("Backtest for pair " + pair + " stopped.");
        return;
      }else{ //it's a check interval and hasn't been cancelled
        backtest.publishTick(pair, chunk, chunkResult, curIndex, diff, backtest.liveSend, client);
      }
    });
  }else{ //it's not a check interval
    backtest.publishTick(pair, chunk, chunkResult, curIndex, diff, backtest.liveSend, client);
  }
};

//TODO: Switch to event-driven backtesting i.e. send ticks as fast as the bot can process them.
backtest.fast = function(pair, startTime, diff){
  backtest.checkIfRunning(pair, function(running){
    if(!running){
      backtest.setRunningFlag(pair, function(){
        var client = redis.createClient();
        
        fs.readFile(conf.public.tickDataDirectory + pair.toUpperCase() + '/index.csv', {encoding: 'utf8'}, 'r', function(err,data){
          var result = [];
          var indexData = data.split('\n');
          for(var i=1;i<indexData.length;i++){
            if(indexData[i].length > 3){
              var temp = indexData[i].split(',');
              temp[1] *= conf.public.backtestTimestampMultiplier;
              temp[2] *= conf.public.backtestTimestampMultiplier;
              result.push(temp);
            }
          }
          var chunk;
          for(var i=0;i<result.length;i++){
            if(parseFloat(result[i][2]) > startTime){
              chunk = parseFloat(result[i][0]);
              break;
            }
          }
          var chunkFile = backtest.readTickFile(pair, chunk, function(err, data){
            var chunkResult = [];
            var chunkData = data.split('\n');
            for(var i=1;i<chunkData.length;i++){
              if(chunkData[i].length > 3){
                var temp = chunkData[i].split(',');
                temp[0] *= conf.public.backtestTimestampMultiplier;
                chunkResult.push(temp);
              }
            }
            var curIndex;
            for(var i=0;i<chunkResult.length;i++){
              if(parseFloat(chunkResult[i][0]) > startTime){
                curIndex = i-1;
                break;
              }
            }
            backtest.fastSend(chunk, chunkResult, curIndex, diff, startTime, pair, client); //chunk, chunkResult, curIndex, diff, oldTime, socket
          });
        });
        return 'Simulation started successfully for symbol ' + pair;
      });
    }else{
      console.log("Backtest already running for symbol " + pair);
    }
  });
};

backtest.fastSend = function(chunk, chunkResult, curIndex, diff, oldTime, pair, client){
  if(curIndex >= chunkResult.length){
    backtest.stopOne(pair, function(){
      backtest.fast(pair, oldTime + 1, diff);
    });
    return;
  }
  if(curIndex % conf.public.fastBacktestCheckInterval === 0){ //if this is a check interval
    backtest.checkIfRunning(pair, function(running){ 
      if(!running){ //and it's been cancelled
        console.log("Backtest for pair " + pair + " stopped.");
        return;
      }else{ //it's a check interval and hasn't been cancelled
        backtest.publishTick(pair, chunk, chunkResult, curIndex, diff, backtest.fastSend, client);
      }
    });
  }else{ //it's not a check interval
    backtest.publishTick(pair, chunk, chunkResult, curIndex, diff, backtest.fastSend, client);
  }
};

backtest.readTickFile = function(pair, chunk, callback) {
  var filePath = conf.public.tickDataDirectory + pair.toUpperCase() + '/' + pair.toUpperCase() + '_' + chunk + '.csv';
  fs.readFile(filePath, {encoding: 'utf8'}, function(err, data){callback(err, data);});
};

backtest.publishTick = function(pair, chunk, chunkResult, curIndex, diff, callback, client) {
  var tickObject = {real: false, pair: pair, timestamp: parseFloat(chunkResult[curIndex][0]), ask: parseFloat(chunkResult[curIndex][1]), bid: parseFloat(chunkResult[curIndex][2])};
  client.publish("ticks", JSON.stringify(tickObject));
  setTimeout(function(){
    callback(chunk, chunkResult, curIndex + 1, diff, chunkResult[curIndex][0], pair, client);
  }, diff);
};

backtest.stop = function(pair){
  //TODO: by-backtest stopping
  dbUtil.mongoConnect(function(db){
    db.collection("backtestFlags").drop(function(err, res){
      db.close();
    });
  });
};

backtest.stopOne = function(pair, callback){
  dbUtil.mongoConnect(function(db){
    db.collection("backtestFlags").removeOne({pair: pair}, function(){
      callback();
    });
  });
}
