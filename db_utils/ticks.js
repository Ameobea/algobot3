/*
Database Tick Utilities

These are a collection of functions used to store and retrieve
tick data from mondodb.  
*/
var mongodb = require("mongodb");
var dbUtils = require("../db_utils/utils");

var tickUtils = exports;

tickUtils.getTicksInRange = function(pair, startTime, endTime, getBefore, callback){
  dbUtils.mongoConnect(function(db){
    var ticks = db.collection("ticks");
    ticks.find({pair: pair, timestamp: {$gte: startTime, $lte: endTime}}).toArray(function(err, res){
      if(getBefore){
        ticks.find({timestamp: {pair: pair, $lt: startTime}}).sort({timestamp: -1}).limit(1).toArray(function(err, prev){
          if(prev.length > 0){
            res.unshift(prev[0]);
            db.close();
            callback(res);
          }else{ // no ticks before first matched element, so duplicate first tick for accuracy
            res.unshift(res[0]);
            db.close();
            callback(res);
          }
        });
      }else{
        db.close();
        callback(res);
      }
    })
  });
}
