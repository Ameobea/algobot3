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

var Promise = require("bluebird");
Promise.onPossiblyUnhandledRejection(function(error){
    throw error;
});

var positionsCache = []; 
// TODO: add functionality to get open positions from broker if bot fails
// TODO: Close all positions in case of an actual emergency where we have open positions with broker of which we have no record

// called each tick and updates strategies with newest information.
tradeGen.eachTick = (data, db)=>{
  return new Promise((fulfill, reject)=>{
    var pair = data.pair;

    if(positionsCache == []){
      ledger.getPositions(pair, {}, db).then(positions => positionsCache = positions);
    }

    var toManage = [];
    positionsCache.forEach(position=>{
      toManage.push(manager.manage(position, data));
    });

    Promise.all(toManage).then(newPositions=>{
      newPositions.forEach(position=>{
        if(position){
          //TODO: Replace old position with new one in database and database cache
        }
      });
    }).then(() => fulfill());// fulfill when done evaluating all conditions of all positions
  });
};
