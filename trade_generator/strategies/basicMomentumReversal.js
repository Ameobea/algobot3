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

var Promise = require("bluebird");
Promise.onPossiblyUnhandledRejection(function(error){
    throw error;
});

strat.config = {
  averagePeriod: 5000,
  momentumPeriod: 5000
};

strat.state = {
  tradeState: false, //false if a trade has already been executed on this side of 0
  negative: undefined, //true if momentum is negative, false if positive
  lastMomentum: undefined, //the value of the last momentum recieved
  lastDirection: undefined //direction the momentum is moving, up or down
};

strat.eachUpdate = (data, db)=>{
  return new Promise((fulfill, reject)=>{
    var env = environment.getEnv(data, db);

    var curMomentum = env.curMomentum({ //this is just a number, no timestamp array etc.
      averagePeriod: strat.config.averagePeriod,
      momentumPeriod: strat.config.momentumPeriod
    });

    if(curMomentum){
      if(typeof strat.state.lastMomentum == "undefined"){
        strat.state.lastMomentum = curMomentum;
      }

      if(typeof strat.state.negative == "undefined"){
        strat.state.negative = curMomentum < 0;
      }else{
        if(strat.state.negative != curMomentum < 0){ //if momentum crosses 0
          strat.state.tradeState = true; //we're ready to make a trade
        }
      }

      var curDirection = curMomentum > strat.state.lastMomentum;

      if( strat.state.tradeState && //ready to make a trade
          strat.state.lastDirection != curDirection && //momentum direction changed
          curMomentum > strat.state.lastMomentum != strat.state.negative){ //direction changed towards reversing negativity

        var state = {
          negative: strat.state.negative,
          direction: curDirection,
          averagePeriod: strat.config.averagePeriod,
          momentumPeriod: strat.config.momentumPeriod
        };

        var func = function(env, state, actions){
          return new Promise((fulfill, reject)=>{
            var momentum = env.curMomentum({
              averagePeriod: state.averagePeriod,
              momentumPeriod: state.momentumPeriod
            });

            if(!state.lastMomentum){
              state.lastMomentum = momentum;
              console.log("First check");
              fulfill();
            }else{
              if( momentum > state.lastMomentum != state.direction && // momentum direction has changed and
                  state.negative != momentum > 0){ // momentum sign has changed
                env.fetchTick({cur: true}, env.db).then(tick=>{
                  var price;
                  if(env.direction){
                    price = tick.ask;
                  }else{
                    price = tick.bid;
                  }

                  actions.closePosition.apply(this, price).then(()=>{
                    console.log("position closed.");
                    fulfill(false);
                  }).catch(err=>{console.log(err);});
                }).catch(err=>{console.log(err);});
              }else{
                console.log("shouldn't close position.");
                fulfill(this);
              }
            }
          });
        };

        var condition = {
          id: uuid(),
          state: state,
          func: func.toString()
        };

        ledger.getBalance(db, balance=>{
          env.fetchTick({cur: true}, db).then(tick=>{
            var price;
            if(curDirection){
              price = tick.ask;
            }else{
              price = tick.bid;
            }

            ledger.openPosition(env.pair, price, balance*0.02, curDirection, [condition], db, ()=>{
              logger.logOpenTrade(env.pair, price, balance*0.02, curDirection, data.timestamp, db); //TODO: handle promise if we make this a promise
              strat.state.tradeState = false;

              console.log("New position opened; fulfilling.");
              fulfill();
            });
          }).catch(err=>{console.log(err);});
        });
      }else{
        fulfill();
      }

      strat.state.lastDirection = curMomentum > strat.state.lastMomentum;
      strat.state.negative = curMomentum < 0;
      strat.state.lastMomentum = curMomentum;
    }else{
      fulfill();
    }
  });
};
