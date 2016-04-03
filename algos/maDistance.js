"use strict";
/*
Moving Average Distance Calculator

This module measures the distance in price between moving averages of different
periods at the same point in time.  By watching the change in these measurements
over time, one can determine the momentum of trends and judge the liklihood
of their continuation.
*/
var conf = require("../conf/conf");

var maDist = exports;

maDist.calc = (pair, timestamp, maPeriod, maPrice, curAverages, db, madistDb)=>{
  return new Promise((f,r)=>{
    conf.public.monitoredAveragePeriods.forEach(monitoredAverage=>{
      if(monitoredAverage >= maPeriod){
        var diff = maPrice - curAverages[pair][monitoredAverage][1];
        if(typeof storecb == "undefined"){
          maDist.store(pair, timestamp, maPeriod, monitoredAverage, diff, db);
        }else{
          maDist.initMadistDb(madistDb, pair, maPeriod, monitoredAverage);

          madistDb[pair][maPeriod.toString()].push({timestamp: timestamp, diff: diff});
        }
      }
    });
  });
};

maDist.store = (pair, timestamp, maPeriod, compPeriod, diff, db)=>{
  var doc = {pair: pair, timestamp: timestamp, maPeriod: maPeriod, compPeriod: compPeriod, diff: diff};
  db.collection("smaDists").insertOne(doc, res=>{});
};

maDist.initMadistDb = (madistDb, pair, maPeriod, monitoredAverage)=>{
  if(typeof madistDb[pair] == "undefined"){
    madistDb[pair] = {};
  }
  if(!madistDb[pair][maPeriod.toString()]){
    madistDb[pair][maPeriod.toString()] = {};
  }
  if(!madistDb[pair][maPeriod.toString()][monitoredAverage.toString()]){
    madistDb[pair][maPeriod.toString()][monitoredAverage.toString()] = [];
  }
}
