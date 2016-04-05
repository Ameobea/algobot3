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
      ()=>{db.collection("smaDists").drop((err, res)=>{});},
      ()=>{db.collection("tradeHistory").drop((err, res)=>{});}
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
      db.close();
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

//TODO: Make this only select some data if we don't want all of it.  
//e.g. every other element for prices, etc.
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
            db.close();
          });
        }else{
          callback([]);
        }
      }
    });
  });
};

// TODO: Integrate this into live/fast backtests so that it will actually be
// used during the bot's execution.

// moves data from a collection with a timestamp lookback
// seconds or more older than timestamp to a different
// collection.  Calls back number of elements moved.
dbUtil.transferOld = (fromCollectionName, toCollectionName, timestamp, lookback, db)=>{
  return new Promise((f,r)=>{
    var fromCollection = db.collection(collectionName);
    var toCollection = db.collection(toCollection);

    var batchInsert = fromCollection.initializeUnorderedBulkOp();

    fromCollection.find({timestamp: {$lt: timestamp-lookback}}).forEach(doc=>{
      batchInsert.insert(doc);
    });

    batchInsert.execute((err,res)=>{
      if(err){
        console.log(err);
      }else{
        fromCollection.deleteMany({timestamp: {$lt: timestmap-lookback}}, (res, con, count)=>{
          f(count);
        });
      }
    });
  });
};

dbUtil.getInstances = ()=>{
  return new Promise((f,r)=>{
    dbUtil.mongoConnect(db=>{
      db.collection("instances").find().toArray((err, instances)=>{
        db.collection("backtestFlags").find().toArray((err, flags)=>{
          f({backtests: flags, instances: instances});
          db.close();
        });
      });
    });
  });
};
