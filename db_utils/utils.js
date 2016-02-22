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
