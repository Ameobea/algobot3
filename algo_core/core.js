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

var averagePeriods = conf.public.monitoredAveragePeriods;
var momentumPeriods = conf.public.monitoredMomentumPeriods;

core.start = function(){
  dbUtil.mongoConnect(function(db){
    var curPrice;
    var lastPrice;         //          average period-\/
    var lastAverages = {}; // lastAverages["usdcad"]["10"] = [timestamp, average]
    var lastMomentums = {};//lastMomentums["uscad"]["10"]["30"] = [timestamp, momentum]
    var curAverages = {};  //         average period-/\    /\-momentum period
    var curMomentums = {};
    //TODO: periodically dump these to the database as a way of resuming mid-backtest etc.

    var redisClient = redis.createClient();
    redisClient.subscribe("prices");

    redisClient.on("message", function(channel, message){
      var priceUpdate = JSON.parse(message);

      var pair = message.pair;
      var timestamp = message.timestamp;

      if(!curAverages.pair){
        curAverages.pair = {};
        lastAverages.pair = {};
      }

      lastPrice = curPrice;
      curPrice = message.price;

      core.calcAverages(priceUpdate, averagePeriods, db, function(average, averagePeriod){
        averagePeriod = averagePeriod.toString();

        if(curAverages.pair[averagePeriod]){
          lastAverages.pair[averagePeriod] = curAverages[averagePeriod];
        }
        curAverages[averagePeriod] = average;
        // Averages updated

        core.calcMomentums(priceUpdate, parseInt(averagePeriod), momentumPeriods, db, function(momentum, momentumPeriod){
          momentumPeriod = momentumPeriod.toString();

          if(!curMomentums.pair){
            curMomentums.pair = {};
            lastMomentums.pair = {};
          }
          if(!curMomentums.pair[averagePeriod]){
            curMomentums.pair[averagePeriod] = {};
            lastMomentums.pair[averagePeriod] = {};
          }
          if(curMomentums.pair[averagePeriod][momentumPeriod]){
            lastMomentums.pair[averagePeriod][momentumPeriod] = curMomentums.pair[averagePeriod][momentumPeriod];
          }
          curMomentums.pair[averagePeriod][momentumPeriod] = [timestamp, momentum];
          // Momentums updated


        });
      });
    });
  });
};

//Returns the period of the average that was calculated
core.calcAverages = function(priceUpdate, averagePeriods, db, callback){
  sma.averageMany(priceUpdate.pair, priceUpdate.timestamp, averagePeriods, db, function(average, averagePeriod){
    callback(average, averagePeriod);
  });
};


core.calcMomentums = function(priceUpdate, averagePeriod, momentumPeriods, db, callback){
  momentumCalc.calcMany(priceUpdate.pair, priceUpdate.timestamp, averagePeriod, momentumPeriods, db, function(momentum, momentumPeriod){
    callback(momentum, momentumPeriod);
  });
};
