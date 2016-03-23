/*
Precalculated Algorithm Core Module

This is the module used by backtesting when the necessary calculations have already
been done and stored in the database.  Instead of treating each tick as a live data
point to be processed, it uses pre-processed data to execute a trading strategy
without having to go through the process of calculating everything again.
*/
var core = exports;

var redis = require("redis");

var conf = require("../conf/conf");
var dbUtil = require("../db_utils/utils");

var curMomentums = {};

core.start = ()=>{
  dbUtil.mongoConnect(db=>{

    var redisClient = redis.createClient();
    redisClient.subscribe("backtestStatus");

    redisClient.on("message", (channel, message)=>{
      var parsed = JSON.parse(message);

      if(parsed.type && parsed.type == "precalced"){
        var startTime = parseFloat(parsed.startTime);
        var endTime = parseFloat(parsed.endTime);
        var pair = parsed.pair;

        core.loadDatabase(pair, startTime, endTime, db).then(dbData=>{
          core.doBacktest(pair, dbData, startTime, endTime, db);
        });
      }
    });
  });
};

core.doBacktest = (pair, dbData, startTime, endTime, db)=>{
  var prices = dbData.filter(collection=>{
    return collection.type == "prices";
  });

  var momentumCollection = dbData.filter(collection=>{
    collection.type == "momentums";
  });

  var crossesCollection = dbData.filter(collection=>{
    collection.type == "smaCrosses";
  });

  prices.data.forEach(priceUpdate=>{
    var timestamp = priceUpdate.timestamp;

    var momentums = momentumCollection.filter(momentum=>{
      momentum.timestamp == timestamp;
    });

    var crosses = crossesCollection.filter(cross=>{
      cross.timestamp == timestamp;
    }).map(cross=>{
      return {period: cross.period, compPeriod: cross.compPeriod, direction: cross.direction};
    });

    core.storeLocalMomentums(pair, momentums);

    tradeGen.eachTick(pair, timestamp, curMomentums[pair], crosses, db);
  });
};


//start times are inclusive, while end times are non-inclusive
core.loadDatabase = (pair, startTime, endTime, db)=>{
  return new Promise((fulfill, reject)=>{
    var collectionNames = ["prices", "smaCrosses", "smaDists", "smas", "momentums"];

    var promises = collectionNames.map((collection)=>{
      return new Promise((f, r)=>{
        db.collection(collection).find({pair: pair, timestamp: {$gte: startTime, $lt: endTime}}).toArray((err, res)=>{
          f({type: collection, data: res});
        });
      });
    });

    Promise.all(promises).then(res=>{
      console.log(res);
      fulfill(res);
    });
  });
};

core.storeLocalMomentums = (pair, momentums)=>{
  if(!curMomentums[pair]){
    curMomentums[pair] = {};
  }
  
  momentums.forEach(momentum=>{
    if(!curMomentums[pair][momentum.averagePeriod.toString()]){
      curMomentums[pair][momentum.averagePeriod.toString()] = {};
    }

    curMomentums[pair][momentum.averagePeriod.toString()][momentum.momentumPeriod]
  });
};
