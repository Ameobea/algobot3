"use strict";
/*
Moving Avreage Cross Strategy #1

For information about this strategy, see README.md.
*/
var mac1 = exports;

mac1.config = {
  maPeriod: 30,
  maCompPeriod: 5000,
  momentumPeriod: 3000,
  momentumCompPeriod: 3000
};

//TODO: Save to redis for some persistance
mac1.status = {};

mac1.getSignal = function(pair, crossStatus, db, callback){
  if(!mac1.status[pair]){
    mac1.status[pair] = {};
  }
  if((typeof mac1.status[pair].lastCrossStatus == "undefined") && crossStatus != "no"){
    mac1.status[pair].lastCrossStatus = crossStatus;
  }

  if(crossStatus != "no" && crossStatus != mac1.status[pair].lastCrossStatus){ //if there's been a cross
    mac1.status[pair].lastCrossStatus = crossStatus;

    callback({direction: crossStatus}); //true = buy, false = sell
  }else{
    callback(false);
  }
};

mac1.manage = function(pair, momentum, callback){
  if(!mac1.status[pair]){
    mac1.status[pair] = {lastMomentumDirection: "nowhere"};
  }
  if(typeof mac1.status[pair].lastMomentum == "undefined"){ //if this is the first momentum being stored
    mac1.status[pair].lastMomentum = momentum;
  }else{
    if(mac1.status[pair].lastMomentumDirection == "nowhere"){ //if this is the first momentum direction calculated
      mac1.status[pair].lastMomentumDirection = momentum[1] > mac1.status[pair].lastMomentum[1];
    }
  }

  if(mac1.status[pair].lastMomentum[1] != momentum[1] && mac1.status[pair].lastMomentumDirection != momentum[1] > mac1.status[pair].lastMomentum[1]){ //direction of momentum has changed
    mac1.status[pair].lastMomentum = momentum;
    mac1.status[pair].lastMomentumDirection = !mac1.status[pair].lastMomentumDirection;
    callback({direction: !mac1.status[pair].lastMomentumDirection}); //close all trades contrary to momentum reversal
  }else{
    mac1.status[pair].lastMomentum = momentum;
    callback(false);
  }
};
