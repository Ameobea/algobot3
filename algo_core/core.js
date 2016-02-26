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

var dbUtil = require("../db_utils/utils");
var sma = require("../algos/average/sma");
var momentumCalc = require("../algos/momentum");

var core = exports;

core.start = function(){
  dbUtil.mongoConnect(function(db){
    db.on("close", function(){console.log("Main MongoDB Connection Dead.");});
    db.on("error", function(){console.log("Main MongoDB Connection Error.");});
    db.on("timeout", function(){console.log("Main MongoDB Database Timed Out.");});
    var redisClient = redis.createClient();
    redisClient.subscribe("prices");
    redisClient.on("message", function(channel, message){
      var priceUpdate = JSON.parse(message);
      core.calcAverages(priceUpdate, db, function(average, averagePeriod){ // calc all averages for that priceUpdate
        core.calcMomentums(priceUpdate, averagePeriod, db, function(){

        });
      });
    });
  });
};

//Returns the period of the average that was calculated
core.calcAverages = function(priceUpdate, db, callback){
  //TODO: Make code that determines which averages should be calculated.
  var averagePeriods = [10,30,60,300,3000];
  sma.averageMany(priceUpdate.pair, priceUpdate.timestamp, averagePeriods, db, function(average, averagePeriod){
    callback(average, averagePeriod);
  });
};


core.calcMomentums = function(priceUpdate, averagePeriod, db, callback){
  var momentumPeriods = [60,120,300,1000];
  momentumCalc.calcMany(priceUpdate.pair, priceUpdate.timestamp, averagePeriod, momentumPeriods, db, function(momentum){
    callback();
  });
};
