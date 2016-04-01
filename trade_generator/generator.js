"use strict";
/*
Trade Generator

Main control point for the trade algorithm.  Funnels data from the bot to the various
parts of the trading algorithm that deals with creating, managing, and closing positions
based on data from the bot.
*/
var tradeGen = exports;

var manager = require("./tradeManager/tradeManager");
var ledger = require("./ledger");
var strats = require("./strategies/index").strats;

var Promise = require("bluebird");
Promise.onPossiblyUnhandledRejection(function(error){
    throw error;
});

process.on("unhandledRejection", function(reason, promise) {
    console.log(reason);
});

// NOTE: event name is camelCase as per node convention
process.on("rejectionHandled", function(promise) {
    console.log("handled rejection");
});

var positionsCache = []; 
// TODO: add functionality to get open positions from broker if bot fails
// TODO: Close all positions in case of an actual emergency where we have open positions with broker of which we have no record

// called each tick and updates strategies with newest information.
tradeGen.eachTick = (data, db)=>{
  return new Promise((fulfill, reject)=>{
    var pair = data.pair;
    var toProcess = [];

    strats.forEach(strat=>{
      toProcess.push(strat.eachUpdate(data, db));
    });

    Promise.all(toProcess).then(()=>{
      //all strategies evaluted.
      //if(positionsCache == []){
        ledger.getPositions(pair, {}, db).then(positions=>{
          positionsCache = positions;
        }).then(()=>{
          toProcess = [];
          positionsCache.forEach(position=>{
            toProcess.push(manager.manage(position, data, [], db));
          });

          Promise.all(toProcess).then(newPositions=>{
            //all conditions are processed for all open positions returning mutated positions
            toProcess = [];
            newPositions.forEach(position=>{
              if(position){ //position has not been closed
                toProcess.push(ledger.updatePosition(position, db));
              }
            });

            Promise.all(toProcess).then(()=>{
              fulfill(); //we're finally ready for the next tick
            }).catch(err=>{console.log(err);});
          }).catch(err=>{console.log(err);});// fulfill when done evaluating all conditions of all positions
        })
      //} 
    }).catch(err=>{console.log(err);});
  });
};
