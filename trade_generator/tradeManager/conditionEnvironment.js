"use strict";
/*
Condition Function Environment Functions

This file contains helper functons that supply information about positions
and market conditions to condition functions for open positions.  
*/
var ledger = require("../ledger");
var conf = require("../../conf/conf");

var Promise = require("bluebird");
Promise.onPossiblyUnhandledRejection(function(error){
    throw error;
});

var conditionEnvironment = exports;

conditionEnvironment.getActions = (env, broker)=>{
  var actions = {};

  actions.resizePosition = (position, multiplier)=>{
    return new Promise((fulfill, reject)=>{
      ledger.resizePosition(position, multiplier, env.db).then(newPosition=>{
        fulfill(newPosition);
      }).catch(err=>{console.log(err);});
    });
  };

  actions.closePosition = (position, closePrice)=>{
    return new Promise((fulfill, reject)=>{
      ledger.closePosition(position, closePrice, env.db).then(()=>{
        fulfill();
      });
    });
  };

  actions.addCondition = (position, condition)=>{
    position.conditions.push(condition);
  };

  actions.removeCondition = (position, id)=>{
    position.conditions = position.conditions.filter(id=>{
      return id != position.id;
    });
  };

  return actions;
};

// data is the collection of information sent/maintained by the bot on each price update
conditionEnvironment.getEnv = (data, db, vardb)=>{
  var env = data;

  env.db = db;
  env.logger = require("../tradeLogger");

  env.curMomentum = req=>{
    if(env.momentums[req.averagePeriod.toString()] && env.momentums[req.momentumPeriod.toString()]){
      return env.momentums[req.averagePeriod.toString()][req.momentumPeriod.toString()][1];
    }else{
      return false;
    }
  };

  env.curAverage = req=>{
    console.log(env.averages);
    if(env.averages[req.period.toString()]){
      return env.averages[req.period.toString()][1];
    }else{
      return false;
    }
  };

  env.curCrossStatus = req=>{
    if(env.crosses[req.period.toString()] && env.crosses[req.period.toString()][req.momentumPeriod.toString()]){
      return env.crosses[req.period.toString()][req.momentumPeriod.toString()];
    }else{
      return false;
    }
  };

  //returns true if no
  env.pairClear = pair=>{
    return ledger.checkPairClear(pair, env.db);
  };

  if(typeof vardb == "undefined"){
    env.fetchTick = req=>{
      var pair, timestamp;

      if(!req.cur){
        pair = req.pair;
        timestamp = req.timestamp;
      }else{
        pair = env.pair;
        timestamp = env.timestamp;
      }

      return new Promise((fulfill, reject)=>{
        env.db.collection("ticks").find({pair: pair, timestamp: timestamp}).toArray((err, ticks)=>{
          fulfill(ticks[0]);
        });
      });
    };
  }else{
    env.fetchTick = req=>{
      return new Promise((f,r)=>{
        if(!req.cur){
          r("Requested non-current tick during no-calc backtest"); //no ticks stored with this backtest method.
        }else{
          for(var i=0;i<vardb.prices[env.pair].length;i++){
            if(vardb.prices[env.pair][i].timestamp == env.timestamp){
              var fakeTick = vardb.prices[env.pair][i];
              fakeTick.bid = fakeTick.price - (conf.public.estimatedSpread/2);
              fakeTick.ask = fakeTick.price + (conf.public.estimatedSpread/2);

              f(fakeTick);
              break;
            }
          }
        }
      });
    };
  }

  return env;
};
