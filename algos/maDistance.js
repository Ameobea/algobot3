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

maDist.calc = function(pair, timestamp, maPeriod, maPrice, curAverages, db){
  conf.public.monitoredAveragePeriods.forEach(function(monitoredAverage){
    if(monitoredAverage >= maPeriod){
      var diff = maPrice - curAverages[pair][monitoredAverage][1];
      maDist.store(pair, timestamp, maPeriod, monitoredAverage, diff, db);
    }
  });
};

maDist.store = function(pair, timestamp, maPeriod, compPeriod, diff, db){
  var doc = {pair: pair, timestamp: timestamp, maPeriod: maPeriod, compPeriod: compPeriod, diff: diff};
  db.collection("smaDists").insertOne(doc, function(res){});
};
