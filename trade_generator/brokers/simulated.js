/*
Simulated Broker

This module simulates a broker by simulating all trade executions/alterations and keeping the status
of those trades recorded internally.  
*/
var broker = exports;

broker.createMarketOrder = (pair, direction)=>{
  return new Promise((fulfill, reject)=>{
    //TODO: DO
    //TODO: Account for broker slippage
    fulfill();
  });
  
}

broker.createLimitOrder = (pair, size, direction)=>{
  return new Promise((fulfill, reject)=>{
    //TODO: DO
    fulfill();
  });
}

broker.resizePosition = (pair, multiplier)=>{
  return new Promise((fulfill, reject)=>{
    //TODO: DO
    fulfill();
  });
}

broker.closePosition = (pair, size)=>{
  return new Promise((fulfill, reject)=>{
    //TODO: DO
    fulfill();
  });
}
