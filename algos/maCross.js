/*
Moving Average Cross Calculator

The general strategy for locating these features is to look for points when moving averages
cross each other.  The distance between two MA lines and the change in this distance can be
used to determine price trends and figure out when price trends end.
*/
var conf = require("../conf/conf");

var maCross = exports;

//crossStatuses[pair][period][compPeriod] = true||false where true = used to be higher and false = used to be lower
var crossStatuses = {};
//TODO: Change so that instead of watching for actual crosses, watch the distance between two smas.

maCross.initCrossStatuses = function(pair, period, compPeriod, status){
  if(!crossStatuses[pair]){
    crossStatuses[pair] = {};
  }
  if(!crossStatuses[pair][period]){
    crossStatuses[pair][period] = {};
  }
  if(typeof crossStatuses[pair][period][compPeriod] == 'undefined'){
    crossStatuses[pair][period][compPeriod] = status;
  }
}

maCross.calc = function(pair, lastAverages, newAveragePeriod, newAverage, timestamp, db){
  conf.public.monitoredAveragePeriods.forEach(function(monitoredPeriod){
    if(lastAverages[pair] && lastAverages[pair][newAveragePeriod.toString()] && monitoredPeriod >= newAveragePeriod){
      var curStatus = (newAverage > lastAverages[pair][monitoredPeriod.toString()][1]);

      maCross.initCrossStatuses(pair, newAveragePeriod.toString(), monitoredPeriod.toString(), curStatus);

      if(curStatus != crossStatuses[pair][newAveragePeriod.toString()][monitoredPeriod.toString()]){
        crossStatuses[pair][newAveragePeriod.toString()][monitoredPeriod.toString()] = curStatus;
        
        maCross.storeCross(pair, timestamp, newAveragePeriod, monitoredPeriod, curStatus, db);
      }
    }
  });
}

maCross.storeCross = function(pair, timestamp, period, compPeriod, direction, db){
  var crosses = db.collection("smaCrosses");
  var doc = {pair: pair, timestamp: timestamp, period: period, compPeriod: compPeriod, direction: direction};
  crosses.insertOne(doc, function(res){});
}
