/*
Momentum Calculator

Calculates the average rate of change between two different
points of a moving average.  
*/
var async = require("async");
var dbUtils = require("../db_utils/utils");
var conf = require("../conf/conf");

var momentum = exports;

//callback is called for each individual momentum calculated
momentum.calcMany = function(pair, endTime, averagePeriod, momentumPeriods, db, callback){
  var tasks = [];

  for(var i=0;i<momentumPeriods.length; i++){
    var momentumPeriod = momentumPeriods[i];
    tasks.push(function(callback2){momentum.momentum(pair, endTime, averagePeriod, momentumPeriod, db, callback)});
  }
  async.parallel(tasks, function(err, res){
    if(err){
      console.log(err);
    }
  });
}

momentum.momentum = function(pair, endTime, averagePeriod, momentumPeriod, db, callback){
  momentum.calc(pair, endTime-momentumPeriod, endTime, averagePeriod, conf.public.accurateMomentum, db, function(momentumValue){
    momentum.store(pair, averagePeriod, momentumPeriod, momentumValue, db, callback);
  });
}

momentum.calc = function(pair, startTime, endTime, averagePeriod, accurate, db, callback){
  var smas = db.collection("smas");
  smas.find({pair: pair, period: averagePeriod, timestamp: {$gte: startTime, $lte: endTime}}).toArray(function(err, averageData){
    if(err){
      console.log(err);
    }else{
      if(accurate){
        smas.find({pair: pair, period: averagePeriod, timestamp: {$lte: startTime}}).sort({timestamp: -1}).limit(1).toArray(function(err, prevAverage){
          if(err){
            console.log(err);
          }else{
            if(prevAverage.length > 0){
              averageData.unshift(prevAverage);
            }else{
              averageData.unshift(averageData[0]);
            }
            callback((averageData[0].value - averageData[averageData.length-1].value) / (endTime-startTime))*conf.public.momentumMultiplier; //accurate
          }
        });
      }else{
        callback((averageData[0].value - averageData[averageData.length-1].value) / (endTime-startTime))*conf.public.momentumMultiplier; //non-accurate
      }
    }
  });
}

momentum.store = function(pair, averagePeriod, momentumPeriod, momentumValue, db, callback){
  var momentums = db.collection("momentums");
  momentums.insertOne({pair: pair, averagePeriod: averagePeriod, momentumPeriod: momentumPeriod, momentum: momentumValue}, function(err, res){
    if(err){
      console.log(err);
    }else{
      callback(momentumValue);
    }
  });
}
