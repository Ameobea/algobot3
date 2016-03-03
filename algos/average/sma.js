/*jslint node: true */
"use strict";
/*
Simple Moving Average Calculation

This script takes a range of ticks as input and calculates the average
price of a pair across that time frame, taking into what percent of the
period each tick took up and weighting them accordingly.
*/
var Promise = require("promise");

var priceUtils = require("../../db_utils/prices");
var conf = require("../../conf/conf");

var sma = exports;

//calculates multiple averages at different periods from one end time
//callback is called for each individual average calculated
sma.averageMany = function(pair, timestamp, periods, db, callback){
  var tasks = periods.map(function(x){
    return new Promise(function(fulfill, reject){
      sma.average(pair, timestamp, x, db, function(average, averagePeriod){
        fulfill(callback(average, averagePeriod));
      });
    });
  });
  Promise.all(tasks);
}

//pull prices from database and calculate average; then store.
sma.average = function(pair, timestamp, period, db, callback){
  sma.calc(pair, timestamp-period, timestamp, conf.public.accurateSMA, db, function(average){
    sma.store(pair, timestamp, period, average, db, function(){callback(average, period)});
  });
};

//pulls prices from database and calculates average
sma.calc = function(pair, startTime, endTime, accurate, db, callback){
  priceUtils.getPricesInRange(pair, startTime, endTime, conf.public.accurateSMA, db, function(prices){
    sma.rawCalc(prices, startTime, endTime, accurate, callback);
  });
};

//calculates average on array of prices
sma.rawCalc = function(prices, startTime, endTime, accurate, callback){
  if((prices.length > 0 && accurate === false) || (prices.length > 1 && accurate === true)){
    if((prices.length > 1 && accurate === false) || (prices.length > 2 && accurate === true)){
      var total = 0;
      if(accurate){
        total += prices[0].price * (prices[1].timestamp-startTime);
        for(var i=2;i<prices.length; i++){
          total += prices[i-1].price * (prices[i].timestamp-prices[i-1].timestamp);
        }
        callback(total/(endTime-startTime)); // accurate and more than one tick in time range
      }else{
        for(var i=1;i<prices.length; i++){
          total += prices[i-1].price * (prices[i].timestamp-prices[i-1].timestamp);
        }
        callback(total/(endTime-tick[0].timestamp)); //non-accurate and at least two prices in time range
      }
    }else{
      callback((((prices[1].timestamp - startTime)*prices[0].price)+((endTime - prices[1].timestamp)*prices[1].price))/(endTime-startTime)); //only one tick returned in the range + one previous tick
    } 
  }else{
    if(prices.length === 0){
      callback(false); // No prices in range or before range
    }else{
      callback(prices[0].price); // only one tick in set; may or may not be accuracy tick but it's the price either way.
    }
  }
};

//stores average in database
sma.store = function(pair, timestamp, period, value, db, callback){
  var smas = db.collection("smas");
  var doc = {pair: pair, period: period, timestamp: timestamp, value: value};
  smas.insertOne(doc, function(res){
    if(conf.public.pubSmas){
      gRedis.publish("smas", JSON.stringify(doc));
    }
    callback();
  });
};
