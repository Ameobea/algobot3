/*jslint node: true */
"use strict";
/*
Database Utilities

Contains various helper functions for dealing with the databases
used by the bot.
*/
var mongodb = require("mongodb");
var async = require("async");
var child_process = require("child_process");

var conf = require("../conf/conf");

var dbUtil = exports;

var Logger = mongodb.Logger;

dbUtil.mongoConnect = (callback)=>{
  var mongoClient = mongodb.MongoClient;
  mongoClient.connect(conf.private.mongodbIP + "/" + conf.private.mongodbDatabase, (err, db)=>{
    if(!err){
      if(conf.public.mongoDebug){Logger.setLevel('debug');}
      callback(db);
    }else{
      console.log("Error connecting to mongodb!");
    }
  });
};

dbUtil.flush = (callback)=>{
  dbUtil.mongoConnect((db)=>{//TODO: Promisify and remove async dependency
    async.parallel([
      ()=>{db.collection("ticks").drop((err, res)=>{});},
      ()=>{db.collection("smas").drop((err, res)=>{});},
      ()=>{db.collection("momentums").drop((err, res)=>{});},
      ()=>{db.collection("prices").drop((err, res)=>{});},
      ()=>{db.collection("smaCrosses").drop((err, res)=>{});},
      ()=>{db.collection("smaDists").drop((err, res)=>{});}
    ], ()=>{
      db.close();
      callback();
    });
  });
};

dbUtil.dump = (callback)=>{
  child_process.execFile(conf.public.dbDumpDir + "db_dump.sh", [conf.public.dbDumpDir + Date.now(), "algobot3"], (err, stdout, stderr)=>{
    callback();
  });
};

dbUtil.load = (dumpName, callback)=>{
  child_process.execFile(conf.public.dbDumpDir + "db_load.sh", [conf.public.dbDumpDir + dumpName], (err, stdout, stderr)=>{
    callback();
  });
};

dbUtil.init = (callback)=>{
  dbUtil.mongoConnect((db)=>{
    dbUtil.createIndexes(db, ()=>{
      callback();
    });
  });
};

dbUtil.createIndexes = (db, callback)=>{
  db.collection("prices").createIndex({pair: 1, timestamp: 1}, (err, res)=>{
    db.collection("smas").createIndex({pair: 1, period: 1, timestamp: 1}, (err, res)=>{
      db.close();
      callback();
    });
  });
};

dbUtil.indexIterator = (db, timeout)=>{
  if(!db){
    dbUtil.mongoConnect((db)=>{
      dbUtil.indexIterator(db, timeout);
    });
  }else{
    dbUtil.createIndexes(db, ()=>{
      setTimeout(()=>{
        dbUtil.indexIterator(db, timeout);
      }, timeout);
    });
  }
};

dbUtil.fetchData = (pair, type, props, range, callback)=>{
  dbUtil.mongoConnect((db)=>{
    var collection = db.collection(type);
    props.pair = pair;
    collection.find(props).sort({timestamp: -1}).limit(1).toArray((err, newestDoc)=>{
      if(err){
        console.log(err);
      }else{
        if(newestDoc.length > 0){
          props.timestamp = {$gte: newestDoc[0].timestamp - range};
          collection.find(props).toArray((err, res)=>{
            callback(res);
          });
        }else{
          callback([]);
        }
      }
    });
  });
};
