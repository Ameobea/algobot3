/*jslint node: true */
"use strict";
/*
No-store Algorithm Core Module

This module is meant for backtesting strategies while cutting
out the database entirely for the performance benefit.  Data is
stored internally and only kept for as long as it is needed in the
current backtest.  
*/
var redis = require("redis");

var conf = require("../conf/conf");
var dbUtil = require("../db_utils/utils");
var sma = require("../algos/average/sma");
var momentumCalc = require("../algos/momentum");
var maCross = require("../algos/maCross");
var maDist = require("../algos/maDistance");
var tradeGen = require("../trade_generator/generator");

var core = exports;

var curAverages = {};
var curMomentums = {};

var toMomentum = [];
var toAverage = [];
var timestamp;

var smasDb = {};
var momentumDb = {};
var pricesDb = {};
var madistDb = {};

core.start = ()=>{};

core.pruneDbs = timestamp=>{
  var low = timestamp - conf.public.nostoreRetentionPeriod; //minumum accepted value for a timestamp

  Object.keys(smasDb).forEach(p=>{
    Object.keys(smasDb[p]).forEach(pd=>{
      for(var i=0;i<smasDb[p][pd].length;i++){
        if(smasDb[p][pd][i].timestamp < low){
          smasDb[p][pd].shift();
        }else{
          break;
        }
      }
    });
  });

  Object.keys(momentumDb).forEach(p=>{
    Object.keys(momentumDb[p]).forEach(apd=>{
      Object.keys(momentumDb[p][apd]).forEach(mpd=>{
        for(let i=0;i<momentumDb[p][apd][mpd].length;i++){
          if(momentumDb[p][apd][mpd][i].timestamp < low){
            momentumDb[p][apd][mpd].shift();
          }else{
            break;
          }
        }
      });
    });
  });

  Object.keys(pricesDb).forEach(p=>{
    for(var i=0;i<pricesDb[p].length;i++){
      if(pricesDb[p][i].timestamp < low){
        pricesDb[p].shift();
      }else{
        break;
      }
    }
  });
}

core.processUpdate = (priceUpdate, db)=>{
  timestamp = priceUpdate.timestamp;

  core.pruneDbs(timestamp);
  console.log("done pruning dbs.");

  return new Promise((f,r)=>{
    var pair = priceUpdate.pair;
    
    if(!pricesDb[pair]){
      pricesDb[pair] = [];
    }
    pricesDb[pair].push({timestamp: timestamp, price: priceUpdate.price});

    if(!curAverages[pair]){
      curAverages[pair] = [];
    }

    toAverage = [];

    conf.public.monitoredAveragePeriods.forEach((monitoredPeriod)=>{
      if(curAverages[pair][monitoredPeriod]){
        if((timestamp - curAverages[pair][monitoredPeriod][0]) > monitoredPeriod/conf.public.averageCalcResolution){ //calc average if the time that has passed > 1/4 its period
          toAverage.push(monitoredPeriod);
        }
      }else{
        toAverage.push(monitoredPeriod);
      }
    });

    var calced = [];
    var a = new Promise((fulfill, reject)=>{
      console.log("inside a");
      core.calcAverages(priceUpdate, toAverage, db, smasDb, pricesDb, (average, averagePeriod)=>{
        maCross.calc(pair, curAverages, averagePeriod, average, timestamp, db, (newCrosses, crossStatuses)=>{
          core.storeLocalAverages(pair, averagePeriod, timestamp, average);

          calced.push({period: averagePeriod, average: average});
          if(calced.length == toAverage.length){
            calced.forEach(calc=>{
              //madistDb is mutated below
              maDist.calc(pair, timestamp, calc.period, calc.average, curAverages, db, madistDb);
            });
          }
          // Averages updated

          toMomentum = [];
          conf.public.monitoredMomentumPeriods.forEach((monitoredMomentumPeriod)=>{
            if(curMomentums[pair] && curMomentums[pair][averagePeriod] && curMomentums[pair][averagePeriod][monitoredMomentumPeriod]){
              if((timestamp - curMomentums[pair][averagePeriod][monitoredMomentumPeriod][0]) > monitoredMomentumPeriod/conf.public.momentumCalcResolution){
                toMomentum.push(monitoredMomentumPeriod);
              }
            }else{
              toMomentum.push(monitoredMomentumPeriod);
            }
          });

          console.log("about to calc momentums");
          core.calcMomentums(priceUpdate, parseInt(averagePeriod), toMomentum, db, momentumDb, smasDb, (momentum, momentumPeriod)=>{
            if(momentum && momentumPeriod){
              console.log("stored local momentums");
              core.storeLocalMomentums(pair, averagePeriod, momentumPeriod, timestamp, momentum);
            }
          }, status=>{ //undefined == no problem
            console.log("finalcallback");
            if(status){
              console.log("ready to check for trade signal");
              fulfill([pair, crossStatuses, {prices: pricesDb, momentum: momentumDb, smas: smasDb, maDist: madistDb}]);
            }else{
              console.log("not enough data to make a successful trade signal");
              reject(); //not enough data to make a successful trade signal
            }
          });
        });
      });
    })

    a.then(res=>{//after all averages + momentums are calculated
      var data = {pair: res[0], timestamp: timestamp, momentums: curMomentums[pair],
        averages: curAverages[pair], crosses: res[1]};
      tradeGen.eachTick(data, db, res[2]).then(()=>{
        console.log("fulfilling");
        r(); //ready for next tick; indicate for it to be sent.
      });
    }, ()=>{
      r(); //momentums fucked up but still ready for next tick
    });
  });
}

//Returns the period of the average that was calculated
core.calcAverages = (priceUpdate, averagePeriods, db, smasDb, pricesDb, callback)=>{
  //TODO: Don't do accurate calculations for averages where the period is large enough to make the added accuracy negligable
  sma.averageMany(priceUpdate.pair, priceUpdate.timestamp, averagePeriods, db, ()=>{}, ()=>{}, (pair, timestamp, period, average)=>{
    if(!smasDb[pair]){
      smasDb[pair] = {};
    }
    if(!smasDb[pair][period.toString()]){
      smasDb[pair][period.toString()] = [];
    }

    smasDb[pair][period.toString()].push({timestamp: timestamp, value: average});
    callback(average, period);
  }, pricesDb);
};


core.calcMomentums = (priceUpdate, averagePeriod, momentumPeriods, db, momentumDb, smasDb, callback, finalCallback)=>{
  momentumCalc.calcMany(priceUpdate.pair, priceUpdate.timestamp, averagePeriod, momentumPeriods, db, ()=>{}, finalCallback, (pair, averagePeriod, momentumPeriod, endTime, momentumValue)=>{
    if(!momentumDb[pair]){
      momentumDb[pair] = {};
    }
    if(!momentumDb[pair][averagePeriod.toString()]){
      momentumDb[pair][averagePeriod.toString()] = {};
    }
    if(!momentumDb[pair][averagePeriod.toString()][momentumPeriod.toString()]){
      momentumDb[pair][averagePeriod.toString()][momentumPeriod.toString()] = [];
    }

    momentumDb[pair][averagePeriod.toString()][momentumPeriod.toString()].push({timestamp: endTime, momentum: momentumValue});
    callback(momentumValue, momentumPeriod);
  }, smasDb);
};

core.storeLocalAverages = (pair_, averagePeriod_, timestamp_, average_)=>{
  averagePeriod_ = averagePeriod_.toString();
  curAverages[pair_][averagePeriod_] = [timestamp_, average_];
};

core.storeLocalMomentums = (pair_, averagePeriod_, momentumPeriod_, timestamp_, momentum_)=>{
  momentumPeriod_ = momentumPeriod_.toString();

  if(!curMomentums[pair_]){
    curMomentums[pair_] = {};
  }
  if(!curMomentums[pair_][averagePeriod_]){
    curMomentums[pair_][averagePeriod_] = {};
  }
  curMomentums[pair_][averagePeriod_][momentumPeriod_] = [timestamp_, momentum_];
};
