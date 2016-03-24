"use strict";
/*
Basic Momentum Strategy #1

For information about this strategy, see README.md.
*/
var Promise = require("bluebird");

var mom1 = exports;

mom1.config = {
  averagePeriod:  5000,
  momentumPeriod: 5000
};

//TODO: Save to redis for some persistance
mom1.status = {};

mom1.initStatus = function(pair, momentum){
  if(!mom1.status[pair]){
    mom1.status[pair] = {};
  }
  if(!mom1.status[pair].lastMomentum){
    mom1.status[pair].lastMomentum = momentum;
  }else{
    if(typeof mom1.status[pair].lastMomentumDirection == "undefined"){
      mom1.status[pair].lastMomentumDirection = momentum > mom1.status[pair].lastMomentum;
    }
  }
};

mom1.getSignal = function(pair, momentum, callback){
  mom1.initStatus(pair, momentum);

  if(momentum != mom1.status[pair].lastMomentum){
    var curMomentumDirection = momentum > mom1.status[pair].lastMomentum;

    if(mom1.status[pair].lastMomentumDirection != curMomentumDirection){
      callback({direction: curMomentumDirection});
    }else{
      callback(false);
    }
  }else{
    callback(false);
  }
};

mom1.updateStatus = function(pair, momentum){
  var curMomentumDirection = momentum > mom1.status[pair].lastMomentum;

  mom1.status[pair].lastMomentumDirection = curMomentumDirection;
  mom1.status[pair].lastMomentum = momentum;
}
