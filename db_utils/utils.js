/*
Database Utilities

Contains various helper functions for dealing with the databases
used by the bot.
*/
var mongodb = require("mongodb");
var conf = require("../conf/conf");

var dbUtil = exports;

dbUtil.mongoConnect = function(callback){
  var mongoClient = mongodb.MongoClient;
  mongoClient.connect(conf.private.mongodbIP + "/" + conf.private.mongodbDatabase, function(err, db){
    if(!err){
      callback(db);
    }else{
      console.log("Error connecting to mongodb!");
    }
  });
}

dbUtil.flush = function(callback){
  dbUtil.mongoConnect(function(db){
    db.collection("ticks").drop(function(err, res){
      db.close();
      callback()
    });
  });
}

dbUtil.init = function(callback){
  dbUtil.mongoConnect(function(db){
    var ticks = db.collection("ticks");

    //create compound index along the keys pair and timestamp
    ticks.createIndex({pair: 1, timestamp: 1}, function(err, res){
      db.close();
      callback();
    });
  });
}
