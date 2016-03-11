/*
Maxima/Minima Locater

This module is responsible for finding the 'peaks' and 'valleys' in moving averages.  
These features can be used to locate trends and price channels.

The general strategy for locating these features is to look for points when moving averages
cross each other.  When a lower-period SMA crosses a higher-period SMA twice, the time
in between those crosses is a local maxima/minima.
*/
var conf = require("../conf/conf");

var maxMin = exports;

//crossStatuses[pair][period][compPeriod] = true||false where true = used to be higher and false = used to be lower
var crossStatuses = {};
//TODO: Change so that instead of watching for actual crosses, watch the distance between two smas.

maxMin.initCrossStatuses = function(pair, period, compPeriod, status){
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

maxMin.calc = function(pair, lastAverages, newAveragePeriod, newAverage, timestamp, db){
  conf.public.monitoredAveragePeriods.forEach(function(monitoredPeriod){
    if(lastAverages[pair] && lastAverages[pair][newAveragePeriod.toString()] && monitoredPeriod >= newAveragePeriod){
      var curStatus = (newAverage > lastAverages[pair][monitoredPeriod.toString()][1]);

      maxMin.initCrossStatuses(pair, newAveragePeriod.toString(), monitoredPeriod.toString(), curStatus);

      if(curStatus != crossStatuses[pair][newAveragePeriod.toString()][monitoredPeriod.toString()]){
        crossStatuses[pair][newAveragePeriod.toString()][monitoredPeriod.toString()] = curStatus;
        
        maxMin.storeCross(pair, timestamp, newAveragePeriod, monitoredPeriod, curStatus, db);
      }
    }
  });
}

maxMin.storeCross = function(pair, timestamp, period, compPeriod, direction, db){
  var crosses = db.collection("smaCrosses");
  var doc = {pair: pair, timestamp: timestamp, period: period, compPeriod: compPeriod, direction: direction};
  crosses.insertOne(doc, function(res){});
}
