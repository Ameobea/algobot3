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
var os = require("os");

var dbUtil = require("../db_utils/utils");
var tickgen = require("../tick_generator/tick_generator");

var backtest = exports;

backtest.checkIfRunning = (pair, callback)=>{
  dbUtil.mongoConnect(db=>{
    var flags = db.collection("backtestFlags");
    flags.find({status: "running", pair: pair}).toArray((err, docs)=>{
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

backtest.clearFlags = callback=>{
  dbUtil.mongoConnect(db=>{
    var flags = db.collection("backtestFlags");
    flags.drop((err, res)=>{
      db.close();
      callback();
    });
  });
};

backtest.setRunningFlag = (pair, callback)=>{
  dbUtil.mongoConnect(db=>{
    var flags = db.collection("backtestFlags");
    flags.insertOne({status: "running", pair: pair}, (err, res)=>{
      db.close();
      callback();
    });
  });
};

backtest.live = (pair, startTime)=>{
  backtest.checkIfRunning(pair, running=>{
    if(!running){
      backtest.setRunningFlag(pair, ()=>{
        var redisClient = redis.createClient();
        
        fs.readFile(conf.public.tickDataDirectory + pair.toUpperCase() + '/index.csv', {encoding: 'utf8'}, 'r', function(err,data){
          var result = [];
          var indexData = data.split('\n');
          for(let i=1;i<indexData.length;i++){
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
          backtest.readTickFile(pair, chunk, (err, data)=>{
            var chunkResult = [];
            var chunkData = data.split('\n');
            for(let i=1;i<chunkData.length;i++){
              if(chunkData[i].length > 3){
                var temp = chunkData[i].split(',');
                temp[0] *= conf.public.backtestTimestampMultiplier;
                chunkResult.push(temp);
              }
            }
            var curIndex;
            for(let i=0;i<chunkResult.length;i++){
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

backtest.liveSend = (chunk, chunkResult, curIndex, diff, oldTime, pair, client)=>{
  if(curIndex >= chunkResult.length){
    backtest.stopOne(pair, ()=>{
      backtest.live(pair, oldTime + 1);
    });
    return;
  }else{
    diff = (parseFloat(chunkResult[curIndex+1][0]) - parseFloat(chunkResult[curIndex][0]))*1000;
  }
  if(curIndex % conf.public.liveBacktestCheckInterval === 0){ //if this is a check interval
    backtest.checkIfRunning(pair, (running)=>{ 
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
backtest.fast = (pair, startTime, diff)=>{
  backtest.checkIfRunning(pair, (running)=>{
    if(!running){
      backtest.setRunningFlag(pair, ()=>{
        var client = redis.createClient();
        
        fs.readFile(conf.public.tickDataDirectory + pair.toUpperCase() + '/index.csv', {encoding: 'utf8'}, 'r', (err,data)=>{
          var result = [];
          var indexData = data.split('\n');
          for(let i=1;i<indexData.length;i++){
            if(indexData[i].length > 3){
              var temp = indexData[i].split(',');
              temp[1] *= conf.public.backtestTimestampMultiplier;
              temp[2] *= conf.public.backtestTimestampMultiplier;
              result.push(temp);
            }
          }
          var chunk;
          for(let i=0;i<result.length;i++){
            if(parseFloat(result[i][2]) > startTime){
              chunk = parseFloat(result[i][0]);
              break;
            }
          }
          backtest.readTickFile(pair, chunk, (err, data)=>{
            var chunkResult = [];
            var chunkData = data.split('\n');
            for(let i=1;i<chunkData.length;i++){
              if(chunkData[i].length > 3){
                var temp = chunkData[i].split(',');
                temp[0] *= conf.public.backtestTimestampMultiplier;
                chunkResult.push(temp);
              }
            }
            var curIndex;
            for(let i=0;i<chunkResult.length;i++){
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

backtest.fastSend = (chunk, chunkResult, curIndex, diff, oldTime, pair, client)=>{
  if(curIndex >= chunkResult.length){
    backtest.stopOne(pair, ()=>{
      backtest.fast(pair, oldTime + 1, diff);
    });
    return;
  }
  if(curIndex % conf.public.fastBacktestCheckInterval === 0){ //if this is a check interval
    backtest.checkIfRunning(pair, (running)=>{
      var load = os.loadavg()[0];

      if(load > .8){
        diff = parseInt(diff) + 3;
        diff = diff.toString();
        console.log("diff increased to " + diff);
      }
      if(load < .7/* && parseInt(diff) > 10*/){
        diff = parseInt(diff) - 1;
        diff = diff.toString();
        console.log("diff decreased to " + diff);
      }

      if(!running){ //and it's been cancelled
        console.log(`Backtest for pair ${pair} stopped.`);
        return;
      }else{ //it's a check interval and hasn't been cancelled
        backtest.publishTick(pair, chunk, chunkResult, curIndex, diff, backtest.fastSend, client);
      }
    });
  }else{ //it's not a check interval
    backtest.publishTick(pair, chunk, chunkResult, curIndex, diff, backtest.fastSend, client);
  }
};

backtest.precalced = (pair, startTime, endTime)=>{
  var client = redis.createClient();

  var obj = {type: "precalced", pair: pair, startTime: startTime, endTime: endTime};
  client.publish("backtestStatus", JSON.stringify(obj));

  return `Precalced backtest successfully started for pair ${pair}`;
};

backtest.nostore = (pair, startTime)=>{
    backtest.checkIfRunning(pair, (running)=>{
    if(!running){
      backtest.setRunningFlag(pair, ()=>{
        var client = redis.createClient();
        
        fs.readFile(conf.public.tickDataDirectory + pair.toUpperCase() + '/index.csv', {encoding: 'utf8'}, 'r', (err,data)=>{
          var result = [];
          var indexData = data.split('\n');
          for(let i=1;i<indexData.length;i++){
            if(indexData[i].length > 3){
              var temp = indexData[i].split(',');
              temp[1] *= conf.public.backtestTimestampMultiplier;
              temp[2] *= conf.public.backtestTimestampMultiplier;
              result.push(temp);
            }
          }
          var chunk;
          for(let i=0;i<result.length;i++){
            if(parseFloat(result[i][2]) > startTime){
              chunk = parseFloat(result[i][0]);
              break;
            }
          }
          backtest.readTickFile(pair, chunk, (err, data)=>{
            var chunkResult = [];
            var chunkData = data.split('\n');
            for(let i=1;i<chunkData.length;i++){
              if(chunkData[i].length > 3){
                var temp = chunkData[i].split(',');
                temp[0] *= conf.public.backtestTimestampMultiplier;
                chunkResult.push(temp);
              }
            }
            var curIndex;
            for(let i=0;i<chunkResult.length;i++){
              if(parseFloat(chunkResult[i][0]) > startTime){
                curIndex = i-1;
                break;
              }
            }
            dbUtil.mongoConnect(db=>{
              backtest.nostoreDb = db;

              backtest.nostoreSend(chunk, chunkResult, curIndex, 0, startTime, pair, client); //chunk, chunkResult, curIndex, diff, oldTime, socket
            })
          });
        });
        return 'Simulation started successfully for symbol ' + pair;
      });
    }else{
      console.log("A Backtest already running for symbol " + pair);
    }
  });
}

backtest.nostoreNext = ()=>{
  backtest.nostoreSend.apply(null, backtest.nostoreState);
}

backtest.nostoreSend = (chunk, chunkResult, curIndex, diff, oldTime, pair, client)=>{
  if(curIndex >= chunkResult.length){
    backtest.stopOne(pair, ()=>{
      backtest.nostore(pair, oldTime + 1, diff);
    });
    return;
  }
  if(curIndex % conf.public.fastBacktestCheckInterval === 0){ //if this is a check interval
    backtest.checkIfRunning(pair, (running)=>{

      if(!running){ //and it's been cancelled
        console.log(`Backtest for pair ${pair} stopped.`);
        return;
      }else{ //it's a check interval and hasn't been cancelled
        backtest.nostoreState = [chunk, chunkResult, curIndex + 1, diff, chunkResult[curIndex][0], pair, client];

        tickgen.processTick({real: false,
          pair: pair,
          timestamp: parseFloat(chunkResult[curIndex][0]),
          ask: parseFloat(chunkResult[curIndex][1]),
          bid: parseFloat(chunkResult[curIndex][2])
        }, backtest.nostoreDb);
      }
    });
  }else{ //it's not a check interval
    backtest.nostoreState = [chunk, chunkResult, curIndex + 1, diff, chunkResult[curIndex][0], pair, client];

    tickgen.processTick({real: false,
      pair: pair,
      timestamp:
      parseFloat(chunkResult[curIndex][0]),
      ask: parseFloat(chunkResult[curIndex][1]),
      bid: parseFloat(chunkResult[curIndex][2])
    }, backtest.nostoreDb);
  }
};

backtest.readTickFile = (pair, chunk, callback)=>{
  var filePath = conf.public.tickDataDirectory + pair.toUpperCase() + '/' + pair.toUpperCase() + '_' + chunk + '.csv';
  fs.readFile(filePath, {encoding: 'utf8'}, (err, data)=>callback(err, data));
};

backtest.publishTick = (pair, chunk, chunkResult, curIndex, diff, callback, client)=>{
  var tickObject = {real: false, pair: pair, timestamp: parseFloat(chunkResult[curIndex][0]), ask: parseFloat(chunkResult[curIndex][1]), bid: parseFloat(chunkResult[curIndex][2])};
  client.publish("ticks", JSON.stringify(tickObject));
  setTimeout(()=>{
    callback(chunk, chunkResult, curIndex + 1, diff, chunkResult[curIndex][0], pair, client);
  }, diff);
};

backtest.stop = pair=>{
  //TODO: by-backtest stopping
  dbUtil.mongoConnect(db=>{
    db.collection("backtestFlags").drop((err, res)=>{
      db.close();
    });
  });
};

backtest.stopOne = (pair, callback)=>{
  dbUtil.mongoConnect(db=>{
    db.collection("backtestFlags").removeOne({pair: pair}, ()=>{
      callback();
    });
  });
};
