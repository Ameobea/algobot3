"use strict";
/*jslint node: true */
/*
Momentum Calculator

Calculates the average rate of change between two different
points of a moving average.  
*/
var dbUtils = require("../db_utils/utils");
var conf = require("../conf/conf");

var momentum = exports;

//callback is called for each individual momentum calculated
momentum.calcMany = (pair, endTime, averagePeriod, momentumPeriods, db, callback, finalCallback)=>{
  var tasks = momentumPeriods.map(x=>{
    return new Promise((fulfill, reject)=>{
      momentum.momentum(pair, endTime, averagePeriod, x, db, (momentum, momentumPeriod)=>{
        fulfill(callback(momentumPeriod, momentum));
      });
    });
  });
  Promise.all(tasks).then(x=>{
    finalCallback();
  }, x=>{
    finalCallback();
  });
};

momentum.momentum = (pair, endTime, averagePeriod, momentumPeriod, db, callback)=>{
  momentum.calc(pair, endTime-momentumPeriod, endTime, averagePeriod, db, momentumValue=>{
    momentum.store(pair, averagePeriod, momentumPeriod, endTime, momentumValue, db, callback);
  });
};

momentum.calc = (pair, startTime, endTime, averagePeriod, db, callback)=>{
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
