"use strict";
/*
Basic momentum reversal strategy.  When the momentum of a pair
switches directions from up to down or vice versa and that switch
is the first to happen since the momentum has been either positive or negative,
open a position in the direction of the swap and hold until it swaps back.
*/
var strat = exports;

var uuid = require("uuid64");

var ledger = require("../ledger");
var logger = require("../tradeLogger");
var environment = require("../tradeManager/conditionEnvironment");

strat.config = {
  averagePeriod: 5000,
  momentumPeriod: 5000
}

strat.state = {
  tradeState: false, //false if a trade has already been executed on this side of 0
  negative: undefined, //true if momentum is negative, false if positive
  lastMomentum: undefined, //the value of the last momentum recieved
  lastDirection: undefined //direction the momentum is moving, up or down
};

start.eachUpdate = (data, db)=>{
  var env = environment.getEnv(data);

  var curMomentum = env.curMomentum({ //this is just a number, no timestamp array etc.
    averagePeriod: strat.config.averagePeriod,
    momentumPeriod: strat.config.momentumPeriod
  });

  var curDirection = curMomentum > strat.state.lastMomentum;

  if(typeof strat.state.lastMomentum == "undefined"){
    strat.state.lastMomentum = curMomentum;
  }

  if(typeof strat.state.negative == "undefined"){
    strat.state.negative == curMomentum > 0;
  }else{
    if(strat.state.negative != curMomentum > 0){ //if momentum crosses 0
      strat.tradeState = true; //we're ready to make a trade
    }
  }

  if( strat.tradeState && //ready to make a trade
      strat.state.lastDirection != curDirection && //momentum direction changed
      curMomentum > strat.state.lastMomentum != strat.state.negative){ //direction changed towards reversing negativity
    // if momentum direction has changed

    var state = {
      negative: strat.state.negative,
      direction: curDirection
    }

    var condition = {
      id: uuid(),
      func: (env, state, actions)=>{
        return new Promise((fulfill, reject)=>{
          env.curMomentum({
            averagePeriod: strat.config.averagePeriod,
            momentumPeriod: strat.config.momentumPeriod
          }).then(momentum=>{
            if(!state.lastMomentum){
              state.lastMomentum = momentum;
            }else{
              if( momentum > state.lastMomentum != state.direction && // momentum direction has changed and
                  state.negative != momentum > 0){ // momentum sign has changed
                actions.closePosition()
              }
            }
          })
        });
      }
    }

    ledger.getBalance(db, balance=>{
      env.fetch.tick({cur: true}).then(tick=>{
        var price;
        if(curDirection){
          price = tick.ask;
        }else{
          price = tick.bid;
        }

        ledger.openPosition(env.pair, price, balance*.02, curDirection, [condition], db, ()=>{
          logger.logOpenTrade(env.pair, price, balance*.02, curDirection, timestamp, db);
        });
      });
    });

    
  }
}
