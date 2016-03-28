"use strict";
/*
Main Strategy Caller

This file is what determines which strategies are active for the bot.
To include a strategy, simply add it to the array.
*/
var strats = exports;

strats.strats = [
  require("./basicMomentumReversal")
];
