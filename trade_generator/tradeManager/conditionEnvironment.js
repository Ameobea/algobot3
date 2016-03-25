"use strict";
/*
Condition Function Environment Functions

This file contains helper functons that supply information about positions
and market conditions to condition functions for open positions.
*/
var conditionEnvironment = exports;

conditionEnvironment.getActions = (position, broker)=>{
  var actions = {};

  actions.resizePosition = multiplier=>{
    var diff = (position.size * amount) - position.size;

    broker.resizePosition(pair, diff);
  }

  return actions;
}

conditionEnvironment.getEnvironment = position=>{
  var env = {};

  env.bid = 0;//TODO: DO
}
