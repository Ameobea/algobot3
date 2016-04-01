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
      //DOING THIS MAKES NO SENSE BUT I'M DOING IT BECAUSE THE ERROR MAKES NO SENSE
      //curDirection = !curDirection;

      if( strat.state.tradeState && //ready to make a trade
          strat.state.lastDirection != curDirection && //momentum direction changed
          curMomentum > strat.state.lastMomentum != strat.state.negative){ //direction changed towards reversing negativity

        env.pairClear(env.pair).then(()=>{
          var state = {
            negative: strat.state.negative,
            lastDirection: curDirection,
            averagePeriod: strat.config.averagePeriod,
            momentumPeriod: strat.config.momentumPeriod,
            goalNegative: curMomentum < 0, //static; close position when negativity swaps
            goalDirection: !curDirection //static; close position when direction changes
          };

          var func = function(env, state, actions){
            //helper functions
            var updateState = momentum=>{
              if(momentum != state.lastMomentum){
                state.lastDirection = momentum > state.lastMomentum;
              }
              state.negative = momentum < 0;
              state.lastMomentum = momentum;
            }

            var closeSelf = ()=>{
              return new Promise((f,r)=>{
                console.log("trying to close position.");
                env.fetchTick({cur: true}, env.db).then(tick=>{
                  var price;
                  if(env.direction){
                    price = tick.ask;
                  }else{
                    price = tick.bid;
                  }

                  actions.closePosition(this, price).then(()=>{
                    env.logger.logClosedTrade(env.pair, this.value, this.openPrice, price, this.direction, env.timestamp, env.db);
                    f();
                  }).catch(err=>{console.log(err);});
                }).catch(err=>{console.log(err);});
              });
            }

            //main condition code
            return new Promise((f, r)=>{
              var momentum = env.curMomentum({
                averagePeriod: state.averagePeriod,
                momentumPeriod: state.momentumPeriod
              });

              if(!state.lastMomentum){
                state.lastMomentum = momentum;
                f(this);
              }else{
                if(state.goalNegative == (momentum > 0) && state.goalDirection == momentum > state.lastMomentum){
                  console.log(state.goalNegative, state.goalDirection, state.lastMomentum);
                  closeSelf().then(()=>r());//reject only if the position is closed during this condition
                }else{
                  updateState(momentum);
                  f(this);
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

              ledger.openPosition(env.pair, price, balance*0.02, !curDirection, [condition], db, ()=>{
                logger.logOpenTrade(env.pair, price, balance*0.02, !curDirection, data.timestamp, db); //TODO: handle promise if we make this a promise
                strat.state.tradeState = false;

                fulfill();
              });
            }).catch(err=>{console.log(err);});
          });
        }, ()=>{fulfill();});
      }else{
        fulfill();
      }

      //update strategy's state
      if(curMomentum != strat.state.lastMomentum){ //if momentum has been updated this price update
        strat.state.lastDirection = curMomentum > strat.state.lastMomentum;
      }
      strat.state.negative = curMomentum < 0;
      strat.state.lastMomentum = curMomentum;
    }else{
      fulfill();
    }
  });
};
