"use strict";
/*jslint node: true */
/*
Momentum Calculator

Calculates the average rate of change between two different
points of a moving average.  
*/
var conf = require("../conf/conf");

var momentum = exports;

var Promise = require("bluebird");
Promise.onPossiblyUnhandledRejection(function(error){
    throw error;
});

// TODO: If you're very very bored or unable to deal with this current mess,
// This file and the places it is used are in need of major refacroting.

//callback is called for each individual momentum calculated
momentum.calcMany = (pair, endTime, averagePeriod, momentumPeriods, db, callback, finalCallback, storeCb, smasDb)=>{
  var tasks = momentumPeriods.map(x=>{
    return new Promise((fulfill, reject)=>{
      momentum.momentum(pair, endTime, averagePeriod, x, db, (momentum, momentumPeriod)=>{
        if(momentum && momentumPeriod){
          fulfill(callback(momentumPeriod, momentum));
        }else{
          reject();
        }
      }, (pair, averagePeriod, momentumPeriod, endTime, momentumValue)=>{
        if(momentumValue){
          fulfill(storeCb(pair, averagePeriod, momentumPeriod, endTime, momentumValue));
        }else{
          reject(false);
        }
      }, smasDb);
    });
  });

  Promise.all(tasks).then(x=>{
    finalCallback(true);
  }, x=>{
    finalCallback(false);
  });
};

momentum.momentum = (pair, endTime, averagePeriod, momentumPeriod, db, callback, storeCb, smasDb)=>{
  var nostore = typeof storeCb != "undefined";

  momentum.calc(pair, endTime-momentumPeriod, endTime, averagePeriod, db, momentumValue=>{
    if(momentumValue){
      if(!nostore){
        momentum.store(pair, averagePeriod, momentumPeriod, endTime, momentumValue, db, callback);
      }else{
        storeCb(pair, averagePeriod, momentumPeriod, endTime, momentumValue);
      }
    }else{//no momentum able to be calculaed
      if(nostore){
        storeCb(false);
      }
    }
  }, smasDb);
};

momentum.calc = (pair, startTime, endTime, averagePeriod, db, callback, smasDb)=>{
  if(typeof smasDb == "undefined"){
    var smas = db.collection("smas");
    smas.find({pair: pair, period: averagePeriod, timestamp: {$lte: startTime}}).sort({timestamp: -1}).limit(1).toArray((err, firstAverage)=>{
      if(err){
        console.log(err);
      }else{
        smas.find({pair: pair, period: averagePeriod, timestamp: endTime}).sort({timestamp: -1}).limit(1).toArray((err, lastAverage)=>{
          if(err || (firstAverage.length === 0 || lastAverage.length === 0)){
            //console.log("Momentum calculation can't find matching SMAS");
          }else{
            var time = endTime - startTime;
            var change = lastAverage[0].value - firstAverage[0].value;
            callback((change / time) * conf.public.momentumMultiplier);
          }
        });
      }
    });
  }else{
    var lastAverage;
    var filteredDb = smasDb[pair][averagePeriod.toString()].filter(elem=>{
      if(elem.timestamp == endTime){
        lastAverage = elem;
      }
      return elem.timestamp <= startTime;
    });
    
    if(lastAverage && filteredDb.length > 0){
      var firstAverage = filteredDb[filteredDb.length-1];

      var time = endTime - startTime;
      var change = lastAverage.value - firstAverage.value;
      callback((change / time) * conf.public.momentumMultiplier);
    }else{
      callback(false);
    }
  }    
};

momentum.store = (pair, averagePeriod, momentumPeriod, timestamp, momentumValue, db, callback)=>{
  var momentums = db.collection("momentums");
  var doc = {pair: pair, averagePeriod: averagePeriod, momentumPeriod: momentumPeriod, timestamp: timestamp, momentum: momentumValue};
  momentums.insertOne(doc, (err, res)=>{
    if(err){
      console.log(err);
    }else{
      if(conf.public.pubMomentums){
        gRedis.publish("momentums", JSON.stringify(doc));
      }
      callback(momentumValue, momentumPeriod);
    }
  });
};
