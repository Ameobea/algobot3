/*jslint node: true */
"use strict";
/*
Database Utilities

Contains various helper functions for dealing with the databases
used by the bot.
*/
var mongodb = require("mongodb");
var async = require("async");

var conf = require("../conf/conf");

var dbUtil = exports;

var Logger = mongodb.Logger;

dbUtil.mongoConnect = function(callback){
  var mongoClient = mongodb.MongoClient;
  mongoClient.connect(conf.private.mongodbIP + "/" + conf.private.mongodbDatabase, function(err, db){
    if(!err){
      if(conf.public.mongoDebug){Logger.setLevel('debug');}
      callback(db);
    }else{
      console.log("Error connecting to mongodb!");
    }
  });
};

dbUtil.flush = function(callback){
  dbUtil.mongoConnect(function(db){
    async.parallel([
      function(){db.collection("ticks").drop(function(err, res){});},
      function(){db.collection("smas").drop(function(err, res){});},
      function(){db.collection("momentums").drop(function(err, res){});},
      function(){db.collection("prices").drop(function(err, res){});}
    ], function(){
      db.close();
      callback();
    });
  });
};

dbUtil.init = function(callback){
  dbUtil.mongoConnect(function(db){
    var prices = db.collection("prices");

    //create compound index along the keys pair and timestamp
    prices.createIndex({pair: 1, timestamp: 1}, function(err, res){
      var smas = db.collection("smas");

      smas.createIndex({pair: 1, period: 1, timestamp: 1}, function(err, res){
        db.close();
        callback();
      });
    });
  });
};

dbUtil.fetchData = function(pair, type, props, range, callback){
  dbUtil.mongoConnect(function(db){
    var collection = db.collection(type);
    props.pair = pair;
    collection.find(props).sort({timestamp: -1}).limit(1).toArray(function(err, newestDoc){
      if(newestDoc.length > 0){
        props.timestamp = {$gte: newestDoc[0].timestamp - range};
        collection.find(props).toArray(function(err, res){
          callback(res);
        });
      }else{
        callback([]);
      }
    });
  });
};
