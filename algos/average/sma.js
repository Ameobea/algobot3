/*
Simple Moving Average Calculation

This script takes a range of ticks as input and calculates the average
price of a pair across that time frame, taking into what percent of the
period each tick took up and weighting them accordingly.
*/
var tickUtils = require("../../db_utils/ticks");
var conf = require("../../conf/conf");

var sma = exports;

sma.calc = function(pair, startTime, endTime, accurate, callback){
  tickUtils.getTicksInRange(pair, startTime, endTime, conf.public.accurateSMA, function(ticks){
    if((ticks.length > 0 && accurate == false) || (ticks.length > 1 && accurate == true)){
      if((ticks.length > 1 && accurate == false) || (ticks.length > 2 && accurate == true)){
        var total = 0;
        if(accurate){
          total += ticks[0].bid * (ticks[1].timestamp-startTime);
          for(var i=2;i<ticks.length; i++){
            total += ticks[i-1].bid * (ticks[i].timestamp-ticks[i-1].timestamp);
          }
          callback(total/(endTime-startTime)); // accurate and more than one tick in time range
        }else{
          for(var i=1;i<ticks.length; i++){
            total += ticks[i-1].bid * (ticks[i].timestamp-ticks[i-1].timestamp);
          }
          callback(total/(endTime-tick[0].timestamp)); //non-accurate and at least two ticks in time range
        }
      }else{
        callback((((ticks[1].timestamp - startTime)*ticks[0].bid)+((endTime - ticks[1].timestamp)*ticks[1].bid))/(endTime-startTime)); //only one tick returned in the range + one previous tick
      } 
    }else{
      if(ticks.length == 0){
        callback(false); // No ticks in range or before range
      }else{
        callback(ticks[0].bid); // only one tick in set; may or may not be accuracy tick but it's the price either way.
      }
    }
  });
}
