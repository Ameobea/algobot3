/*
Tick Generator

Parses incoming ticks from any source (backtest or live data feed).
It then stores them in the database as well as sending them to any
other modules that need them.  
*/

var redis = require("redis");

var tick_generator = exports;

tick_generator.listen = function(){
  var client = redis.client();

  client.subscribe("ticks");
  client.on("message", function(channel, message){
    var tick = JSON.parse(message);
    store_tick(tick.pair, tick.timestamp, tick.ask, tick.bid);
  });
}

tick_generator.store_tick = function(pair, timestamp, ask, bid){

}
