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

var core = exports;

core.start = function(){
  dbUtil.mongoConnect(function(db){
    var curPrice = {};
    var lastPrice = {};    //          average period-\/
    var lastAverages = {}; // lastAverages["usdcad"]["10"] = [timestamp, average]
    var lastMomentums = {};//lastMomentums["uscad"]["10"]["30"] = [timestamp, momentum]
    var curAverages = {};  //         average period-/\    /\-momentum period
    var curMomentums = {};
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
        lastAverages[pair] = {};
      }

      if(curPrice[pair]){lastPrice[pair] = curPrice[pair];}
      curPrice[pair] = [priceUpdate.timestamp, priceUpdate.price];

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

      core.calcAverages(priceUpdate, toAverage, db, function(average, averagePeriod){
        averagePeriod = averagePeriod.toString();

        if(curAverages[pair][averagePeriod]){
          lastAverages[pair][averagePeriod] = curAverages[averagePeriod];
        }
        curAverages[pair][averagePeriod] = [timestamp, average];
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
          momentumPeriod = momentumPeriod.toString();

          if(!curMomentums[pair]){
            curMomentums[pair] = {};
            lastMomentums[pair] = {};
          }
          if(!curMomentums[pair][averagePeriod]){
            curMomentums[pair][averagePeriod] = {};
            lastMomentums[pair][averagePeriod] = {};
          }
          if(curMomentums[pair][averagePeriod][momentumPeriod]){
            lastMomentums[pair][averagePeriod][momentumPeriod] = curMomentums[pair][averagePeriod][momentumPeriod];
          }
          curMomentums[pair][averagePeriod][momentumPeriod] = [timestamp, momentum];
          // Momentums updated

        });
      });
    });
  });
};

//Returns the period of the average that was calculated
core.calcAverages = function(priceUpdate, averagePeriods, db, callback){
  sma.averageMany(priceUpdate.pair, priceUpdate.timestamp, averagePeriods, db, function(average, pd){
    callback(average, pd);
  });
};


core.calcMomentums = function(priceUpdate, averagePeriod, momentumPeriods, db, callback){
  momentumCalc.calcMany(priceUpdate.pair, priceUpdate.timestamp, averagePeriod, momentumPeriods, db, function(momentumPeriod, momentum){
    callback(momentum, momentumPeriod);
  });
};
