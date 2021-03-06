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
sma.averageMany = (pair, timestamp, periods, db, callback, finalCallback, storeCallback, pricesDb)=>{
  var calced = [];
  var tasks = periods.map(x=>{
    return new Promise((fulfill, reject)=>{
      sma.average(pair, timestamp, x, db, (average, averagePeriod)=>{
        calced.push({period: averagePeriod, average: average});
        fulfill(callback(average, averagePeriod));
      }, storeCallback, pricesDb);
    });
  });

  Promise.all(tasks).then(calced=>{
    finalCallback(calced);
  });
};

//pull prices from database and calculate average; then store.
sma.average = (pair, timestamp, period, db, callback, storeCallback, pricesDb)=>{
  var nostore = typeof storeCallback != "undefined"; //true if not storing ticks

  sma.calc(pair, timestamp-period, timestamp, conf.public.accurateSMA, db, average=>{
    if(!nostore){
      sma.store(pair, timestamp, period, average, db, ()=>callback(average, period));
    }else{
      storeCallback(pair, timestamp, period, average); //Callback will NOT be run!!
    }
  }, pricesDb);
};

//pulls prices from database and calculates average
sma.calc = (pair, startTime, endTime, accurate, db, callback, pricesDb)=>{
  if(typeof pricesDb == "undefined"){
    priceUtils.getPricesInRange(pair, startTime, endTime, conf.public.accurateSMA, db, prices=>{
      sma.rawCalc(prices, startTime, endTime, accurate, callback);
    });
  }else{
    sma.rawCalc(pricesDb[pair], startTime, endTime, accurate, callback);
  }
};

//calculates average on array of prices
sma.rawCalc = (prices, startTime, endTime, accurate, callback)=>{
  if((prices.length > 0 && !accurate) || (prices.length > 1 && accurate)){
    if((prices.length > 1 && !accurate) || (prices.length > 2 && accurate)){
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
sma.store = (pair, timestamp, period, value, db, callback)=>{
  var smas = db.collection("smas");
  var doc = {pair: pair, period: period, timestamp: timestamp, value: value};
  smas.insertOne(doc, res=>{
    if(conf.public.pubSmas){
      gRedis.publish("smas", JSON.stringify(doc));
    }
    callback();
  });
};
