/*jslint node: true */
"use strict";
/*
Database Price Utilities

These are a collection of functions used to store and retrieve
tick data from mondodb.  
*/
var priceUtils = exports;

priceUtils.getPricesInRange = function(pair, startTime, endTime, getBefore, db, callback){
  var prices = db.collection("prices");
  prices.find({pair: pair, timestamp: {$gte: startTime, $lte: endTime}}).toArray(function(err, res){
    if(err){
      console.log("Error in prices.js line 14: ", err);
    }
    if(getBefore){
      prices.find({timestamp: {pair: pair, $lt: startTime}}).sort({timestamp: -1}).limit(1).toArray(function(err, prev){
        if(err){
          console.log("Error in prices.js line 19: ", err);
        }
        if(prev.length > 0){
          res.unshift(prev[0]);
          callback(res);
        }else{ // no prices before first matched element, so duplicate first tick for accuracy
          res.unshift(res[0]);
          callback(res);
        }
      });
    }else{
      callback(res);
    }
  });
};
