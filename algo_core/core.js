/*
Algorithm Core Module

This is the 'brain' of the bot.  It keeps track of all the other
modules and determines what calculations are made.  It recieves a processed
feed of data from live sources and makes requests to other modules and the
database in order to determine trading conditions.
*/
var redis = require("redis");

var dbUtil = require("../db_utils/utils");
var conf = require("../conf/conf");
var sma = require("../algos/average/sma");
var momentumCalc = require("../algos/momentum");

var core = exports;

core.start = function(){
  dbUtil.mongoConnect(function(db){
    var redisClient = redis.createClient();
    redisClient.subscribe("ticks");

    redisClient.on("message", function(channel, message){
      var tick = JSON.parse(message);
      if(tick.stored == true){
        core.calcAverages(tick, db, function(average, averagePeriod){ // calc all averages for that tick
          core.calcMomentums(tick, averagePeriod, db, function(){

          });
        });
      }
    });
  });
}

//Returns the period of the average that was calculated
core.calcAverages = function(tick, db, callback){
  //TODO: Make code that determines which averages should be calculated.
  var averagePeriods = [10,30,60,300,3000];
  sma.averageMany(tick.pair, tick.timestamp, averagePeriods, db, function(average, averagePeriod){
    callback(average, averagePeriod);
  });
}


core.calcMomentums = function(tick, averagePeriod, db, callback){
  var momentumPeriods = [60,120,300,1000];
  momentumCalc.calcMany(tick.pair, tick.timestamp, averagePeriod, momentumPeriods, db, function(momentum){
    console.log(momentum);
  });
}
