/*
Backtest

Contains functions to initiate and manage backtests.  They read data
out of the flatfile tick data storage files in conf.public.tickDataDirectory
and send them to the Tick Generator.
*/

var fs = require('fs');
var conf = require("../conf/conf");
var redis = require("redis");

var backtest = exports;

backtest.live = function(pair, startTime){
  //TODO: Verify that a backtest is not already running for the same pair
  //TODO: Set the flag that the backtest is running in the database.
  var client = redis.createClient();
  //TODO: Set config options for redis and add password
  fs.readFile(conf.public.tickDataDirectory + pair.toUpperCase() + '/index.csv', {encoding: 'utf8'}, 'r', function(err,data){
    var result = [];
    var indexData = data.split('\n');
    for(var i=1;i<indexData.length;i++){
      if(indexData[i].length > 3){
        result.push(indexData[i].split(','));
      }
    }
    for(var i=0;i<result.length;i++){
      if(parseFloat(result[i][2]) > startTime){
        var chunk = parseFloat(result[i][0]);
        break;
      }
    }
    var chunkFile =  backtest.readTickFile(pair, chunk, function(err, data){
      var chunkResult = [];
      var chunkData = data.split('\n');
      for(var i=1;i<chunkData.length;i++){
        if(chunkData[i].length > 3){
          chunkResult.push(chunkData[i].split(','));
        }
      }
      for(var i=0;i<chunkResult.length;i++){
        if(parseFloat(chunkResult[i][0]) > startTime){
          var curIndex = i-1;
          break;
        }
      }
      backtest.liveSend(chunk, chunkResult, curIndex, 0, parseFloat(chunkResult[curIndex][0]), pair, client);
    });
  });
}

backtest.liveSend = function(chunk, chunkResult, curIndex, diff, oldTime, pair, client){
  if(curIndex > chunkResult.length){
    curIndex = 1
    chunk++;
    chunkResult = [];
    var chunkData = data.split('\n');
    var chunkFile = backtest.readTickFile(pair, chunk, function(err, data){
      for(var i=1;i<chunkData.length;i++){
        if(chunkData[i].length > 3){
          chunkResult.push(chunkData[i].split(','));
        }
      }
    });
    diff = parseFloat(chunkResult[1][0]) - oldTime;
  }else{
    diff = (parseFloat(chunkResult[curIndex+1][0]) - parseFloat(chunkResult[curIndex][0]))*1000;
  }
  backtest.publishTick(pair, chunk, chunkResult, curIndex, diff, backtest.liveSend, client);
}

backtest.fast = function(pair, startTime, diff){
  //TODO: Verify that a backtest is not already running for the same pair
  //TODO: Set the flag that the backtest is running in the database.
  var client = redis.createClient();
  //TODO: Set config options for redis and add password
  fs.readFile(conf.public.tickDataDirectory + pair.toUpperCase() + '/index.csv', {encoding: 'utf8'}, 'r', function(err,data){
    result = [];
    var indexData = data.split('\n');
    for(var i=1;i<indexData.length;i++){
      if(indexData[i].length > 3){
        result.push(indexData[i].split(','));
      }
    }
    for(var i=0;i<result.length;i++){
      if(parseFloat(result[i][2]) > startTime){
        var chunk = parseFloat(result[i][0]);
        break;
      }
    }
    var chunkFile = backtest.readTickFile(pair, chunk, function(err, data){
      chunkResult = [];
      var chunkData = data.split('\n');
      for(var i=1;i<chunkData.length;i++){
        if(chunkData[i].length > 3){
          chunkResult.push(chunkData[i].split(','));
        }
      }
      for(var i=0;i<chunkResult.length;i++){
        if(parseFloat(chunkResult[i][0]) > startTime){
          var curIndex = i-1;
          break;
        }
      }
      backtest.fastSend(chunk, chunkResult, curIndex, diff, startTime, pair, client); //chunk, chunkResult, curIndex, diff, oldTime, socket
    });
  });
  return 'Simulation started successfully for symbol ' + pair;
}

backtest.fastSend = function(chunk, chunkResult, curIndex, diff, oldTime, pair, client){
  //TODO: Check the backtest hasn't been canceled before proceeding.
  if(curIndex > chunkResult.length){
    curIndex = 1;
    chunk++;
    chunkResult = [];
    var chunkData = data.split('\n');
    var chunkFile = backtest.readTickFile(pair, chunk, function(err, data){
      for(var i=1;i<chunkData.length;i++){
        if(chunkData[i].length > 3){
          chunkResult.push(chunkData[i].split(','));
        }
      }
    });
  }
  backtest.publishTick(pair, chunk, chunkResult, curIndex, diff, backtest.fastSend, client);
}

backtest.readTickFile = function(pair, chunk, callback) {
  return fs.readFile(
    conf.public.tickDataDirectory + pair.toUpperCase() + '/' + pair.toUpperCase() + '_' + chunk + '.csv',
    {encoding: 'utf8'}, 'r', callback
  );
};

backtest.publishTick = function(pair, chunk, chunkResult, curIndex, diff, callback, client) {
  var tickObject = {pair: pair, timestamp: chunkResult[curIndex][0], ask: chunkResult[curIndex][1], bid: chunkResult[curIndex][2]};
  client.publish("ticks", JSON.stringify(tickObject));
  setTimeout(function(){
    callback(chunk, chunkResult, curIndex + 1, diff, chunkResult[curIndex][0], pair, client);
  }, diff);
};

backtest.reset = function(){
  //TODO: Clear all running backtest flags from database.
}

backtest.stop = function(pair){
  //TODO
}
