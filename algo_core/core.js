/*jslint node: true */
"use strict";
/*
Algorithm Core Module

This is the 'brain' of the bot.  It keeps track of all the other
modules and determines what calculations are made.  It recieves a processed
feed of data from live sources and makes requests to other modules and the
database in order to determine trading conditions.
*/
var redis = require("redis");

var conf = require("../conf/conf");
var dbUtil = require("../db_utils/utils");
var sma = require("../algos/average/sma");
var momentumCalc = require("../algos/momentum");
var maCross = require("../algos/maCross");
var maDist = require("../algos/maDistance");

var core = exports;

var curAverages = {};
var curMomentums = {};

core.start = function(){
  dbUtil.mongoConnect(function(db){
    var toMomentum = [];
    var toAverage = [];
    var timestamp;
    var priceUpdate;
    //TODO: periodically dump these to the database as a way of resuming mid-backtest etc.

    var redisClient = redis.createClient();
    redisClient.subscribe("prices");

    redisClient.on("message", function(channel, message){
      priceUpdate = JSON.parse(message);

      var pair = priceUpdate.pair;
      timestamp = priceUpdate.timestamp;

      if(!curAverages[pair]){
        curAverages[pair] = {};
      }

      toAverage = [];

      conf.public.monitoredAveragePeriods.forEach(function(monitoredPeriod){
        if(curAverages[pair][monitoredPeriod]){
          if((timestamp - curAverages[pair][monitoredPeriod][0]) > monitoredPeriod/conf.public.averageCalcResolution){ //calc average if the time that has passed > 1/4 its period
            toAverage.push(monitoredPeriod);
          }
        }else{
          toAverage.push(monitoredPeriod);
        }
      });

      var calced = [];

      core.calcAverages(priceUpdate, toAverage, db, function(average, averagePeriod){

        maCross.calc(pair, curAverages, averagePeriod, average, timestamp, db);

        core.storeLocalAverages(pair, averagePeriod, timestamp, average);

        calced.push({period: averagePeriod, average: average});
        if(calced.length == toAverage.length){
          calced.forEach(function(calc){
            maDist.calc(pair, timestamp, calc.period, calc.average, curAverages, db);
          });
        }
        // Averages updated

        toMomentum = [];
        conf.public.monitoredMomentumPeriods.forEach(function(monitoredMomentumPeriod){
          if(curMomentums[pair] && curMomentums[pair][averagePeriod] && curMomentums[pair][averagePeriod][monitoredMomentumPeriod]){
            if((timestamp - curMomentums[pair][averagePeriod][monitoredMomentumPeriod][0]) > monitoredMomentumPeriod/conf.public.momentumCalcResolution){
              toMomentum.push(monitoredMomentumPeriod);
            }
          }else{
            toMomentum.push(monitoredMomentumPeriod);
          }
        });

        core.calcMomentums(priceUpdate, parseInt(averagePeriod), toMomentum, db, function(momentum, momentumPeriod){
          core.storeLocalMomentums(pair, averagePeriod, momentumPeriod, timestamp, momentum);
          // Momentums updated

        });
      });
    });
  });
};

//Returns the period of the average that was calculated
core.calcAverages = function(priceUpdate, averagePeriods, db, callback){
  //TODO: Don't do accurate calculations for averages where the period is large enough to make the added accuracy negligable
  sma.averageMany(priceUpdate.pair, priceUpdate.timestamp, averagePeriods, db, function(average, pd){
    callback(average, pd);
  });
};


core.calcMomentums = function(priceUpdate, averagePeriod, momentumPeriods, db, callback){
  momentumCalc.calcMany(priceUpdate.pair, priceUpdate.timestamp, averagePeriod, momentumPeriods, db, function(momentumPeriod, momentum){
    callback(momentum, momentumPeriod);
  });
};

core.storeLocalAverages = function(pair_, averagePeriod_, timestamp_, average_){
  averagePeriod_ = averagePeriod_.toString();
  curAverages[pair_][averagePeriod_] = [timestamp_, average_];
}

core.storeLocalMomentums = function(pair_, averagePeriod_, momentumPeriod_, timestamp_, momentum_){
  momentumPeriod_ = momentumPeriod_.toString();

  if(!curMomentums[pair_]){
    curMomentums[pair_] = {};
  }
  if(!curMomentums[pair_][averagePeriod_]){
    curMomentums[pair_][averagePeriod_] = {};
  }
  curMomentums[pair_][averagePeriod_][momentumPeriod_] = [timestamp_, momentum_];
}
