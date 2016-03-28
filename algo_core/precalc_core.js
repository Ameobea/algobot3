"use strict";
/*
Precalculated Algorithm Core Module

This is the module used by backtesting when the necessary calculations have already
been done and stored in the database.  Instead of treating each tick as a live data
point to be processed, it uses pre-processed data to execute a trading strategy
without having to go through the process of calculating everything again.
*/
var core = exports;

var redis = require("redis");

var dbUtil = require("../db_utils/utils");
var tradeGen = require("../trade_generator/generator");

var Promise = require("bluebird");
Promise.onPossiblyUnhandledRejection(function(error){
    throw error;
});

var curMomentums = {};
var curAverages  = {};
var curCrosses   = {};

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

  var pricesCollection = dbData.filter(collection=>{
    return collection.type == "prices";
  })[0].data;

  var momentumCollection = dbData.filter(collection=>{
    return collection.type == "momentums";
  })[0].data;

  var crossesCollection = dbData.filter(collection=>{
    return collection.type == "smaCrosses";
  })[0].data;

  var averagesCollection = dbData.filter(collection=>{
    return collection.type == "smas";
  })[0].data;

  core.iterPrices(dbData, pair, db, 0, pricesCollection, averagesCollection, momentumCollection, crossesCollection);
};

//this simulates a tick being sent and processed
core.iterPrices = (dbData, pair, db, index, pricesCollection, averagesCollection, momentumCollection, crossesCollection, state)=>{
  core.initState(state);

  if(index >= pricesCollection.length){
    console.log("All data processed.");
    return;
  }

  //TODO: don't load old trade history in db dumps

  var priceUpdate = pricesCollection[index];

  return new Promise((fulfill, reject)=>{
    var timestamp = priceUpdate.timestamp;

    var momentums = momentumCollection.filter(momentum=>{
      return momentum.timestamp == timestamp;
    });

    var averages = averagesCollection.filter(average=>{
      return average.timestamp == timestamp;
    });

    var newCrosses = crossesCollection.filter(cross=>{
      return cross.timestamp == timestamp;
    });

    core.updateState(state);

    newCrosses = newCrosses.map(cross=>{
      return {period: cross.period, compPeriod: cross.compPeriod, direction: cross.direction};
    });

    core.storeLocalMomentums(pair, momentums);
    core.storeLocalAverages(pair, averages);
    core.storeLocalCrosses(pair, newCrosses);

    var data = {pair: pair, timestamp: timestamp, momentums: curMomentums[pair],
      averages: curAverages[pair], crosses: curCrosses};
    
    tradeGen.eachTick(data, db).then(()=>{
      fulfill(); //once done processing latest trade data, send next price update.
    });
  }).then(()=>{
    //simulate the next price update being sent
    core.iterPrices(dbData, pair, db, index + 1, pricesCollection, averagesCollection, momentumCollection, crossesCollection);
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
    
    curMomentums[pair][momentum.averagePeriod.toString()][momentum.momentumPeriod] = [momentum.timestamp, momentum.momentum];
  });
};

core.storeLocalAverages = (pair, averages)=>{
  if(!curAverages[pair]){
    curAverages[pair] = {};
  }

  averages.forEach(average=>{
    curAverages[pair][average.period.toString()] = [average.timestamp, average.value];
  });
};

core.storeLocalCrosses = (pair, newCrosses)=>{
  if(!curCrosses[pair]){
    curCrosses[pair] = {};
  }

  newCrosses.forEach(cross=>{
    if(!curCrosses[pair][cross.period.toString()]){
      curCrosses[pair][cross.period.toString()] = {};
    }

    curCrosses[pair][cross.period.toString()][cross.compPeriod.toString()] = cross.direction;
  });
};

core.updateState = (state, pair)=>{
  //Cross statuses
  if(!state.crossStatuses){
    state.crossStatuses = {};
  }

  if(!state.crossStatuses[pair]){
    state.crossStatuses[pair] = {};
  }

  //TODO: maCross.updateCrossStatuses(state.crossStatuses, pair, )
};
