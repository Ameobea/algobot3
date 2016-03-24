"use strict";
/*
Trade Generator

Makes the decision that the bot believes a position will go up/down, when, and by how much.  
Also reports the expected probability that the event will occur (which can be determined from backtesting)
and conditions on when the trade should be closed.  See README.md
*/
var tradeGen = exports;

var tradeLogger = require("./tradeLogger");
var ledger = require("./ledger");

var strat = require("./strategies/basicMomentumReversal/index");
var manager = require("./trade_managers/binaryKelley/binaryKelley")

var Promise = require("bluebird");

tradeGen.config = {

}

//called each tick and updates strategies with newest information.
tradeGen.eachTick = (pair, timestamp, curPairMomentums, newCrosses, db, callback)=>{
  var crossStatus = "no";

  if(newCrosses.length > 0){
    newCrosses.forEach(cross=>{
      if(cross.period == strat.config.maPeriod && cross.compPeriod == strat.config.maCompPeriod){
        crossStatus = cross.direction;
      }
    });
  }

  if(!curPairMomentums[strat.config.averagePeriod.toString()] || !curPairMomentums[strat.config.averagePeriod.toString()][strat.config.momentumPeriod.toString()]){
    if(callback){
      callback(false);
    }else{
      return false;
    }
  }

  var momentum = curPairMomentums[strat.config.averagePeriod.toString()][strat.config.momentumPeriod.toString()][1];

  new Promise((fulfill, reject)=>{
    strat.getSignal(pair, momentum, (signal)=>{
      if(signal){ //if it's time to make a trade
        ledger.getOpenPositions(pair, {}, db, (positions)=>{
          if(positions.length === 0){//not already a position open
            manager.getTradeSize(db, (size)=>{
              tradeGen.getTick(pair, timestamp, db, (tick)=>{
                if(signal.direction){
                  var openPrice = tick.bid;
                }else{
                  var openPrice = tick.ask;
                }

                ledger.openPosition(pair, openPrice, size, signal.direction, db, ()=>{
                  tradeLogger.logOpenTrade(pair, openPrice, size, signal.direction, timestamp, db);
                  fulfill(signal); //trade made and signal
                });
              });
            });
          }else{
            fulfill(signal); //no trade made + signal
          }
        });
      }else{
        reject(); //no signal
      }
    });
  }).then(function(signal){ //there was a signal
    ledger.getOpenPositions(pair, {direction: !signal.direction}, db, function(positions){
      positions.forEach(function(position){
        tradeGen.getTick(pair, timestamp, db, function(tick){
          if(position.direction){
            var closePrice = tick.ask;
          }else{
            var closePrice = tick.bid;
          }

          ledger.closePosition(position._id, closePrice, db, function(){
            tradeLogger.logClosedTrade(pair, position.units, position.openPrice, closePrice, position.direction, timestamp, db);
          });
        });
      });
    });
  }, function(signal){}).then(function(){ //need to catch the rejection in order to chain thens
    strat.updateStatus(pair, momentum);
  }).then(()=>{
    if(callback){
      callback();
    }
  });
}

tradeGen.getTick = function(pair, timestamp, db, callback){
  db.collection("ticks").find({timestamp: timestamp}).toArray(function(err, ticks){
    callback(ticks[0]);
  });
}
