# Trade Manager Documentation

The trade manager module is the part of the bot that deals with currently open positions or requests to open positions.  Since you're usually going to want to do something with an open position at some point, trade manager exists to do that for you.

For each member of the `positions` collection, a subdocument called `manage` exists which contains a list of conditions that the trade manager uses to act upon that position.

## Manage Document Reference

See https://drive.google.com/file/d/0Bw3Lu3S0XCdOTEJIXzJCcG1tb1U/view?usp=sharing for a diagram of the database schema.

### Overview

When creating a position, there are several parts that are included.  The first is the position data itself, which contains information such as the initial size of the position, the pair, the timestamp, etc.

In addition, three other pieces of data are included: State, Conditions, and Actions.  Together, these three objects allow for positions to be automatically managed on each price update.  See the below sections for a more in-depth explaniation of their functionality.

### Conditions

The `manage` collection has a subcollection called `conditions`.  These are a set of conitions that must be met for an action to be taken.

On a database level, conditions are stored in the following form:

`{id: «unique position id», func: (env, state, actions)=>{return new Promise((fulfill, reject)=> ... }}`

The `func` property of conditions are passed in as Promises.  Each of these conditions are evaluted on each priceUpdate.  Each condition must also fulfill with either `false` or an updated version of `position`.  This can be useful if things such as position state are altered or new condition promises are added.  Perhaps change this to automatically detect changes.

#### Creating conditions

Conditions are either created during the creation of a position in `openPosition()` or added using the function `addCondition()` in tradeManager.  Each condition is created with a name as well as an ID allowing for them to be accessed/removed programatically as well.

The following is an example of a condition function that increases the position size by 25% if the bid is lower than or equal to a value set in `state`:

```
(env, state, actions)=>{
  return new Promse(fulfill, reject){
    if(env.bid <= state.buyThreshold){
      state.buyThreshold *= .99;
      actions.resizePosition(1.25);
      fulfill(position); //position has been altered so fulfill with position
    }else{
      fulfill(false); //No changes made to position so just fulfill false
    }
  }
}
```

### Environment
Conditions have access to a variety of variables that provide information about the curren position or market data calculated by the bot.  They can be included in condition functions using the `env` variable that is injected into all evaluated functions.

The `conditionEnvironment` module processes raw data from the bot into an environment object that can be used with condition functions.  The `data` object used with this module should have the following form:

`{pair: pair, timestamp: timestamp, momentums: curMomentums[pair], averages: curAverages[pair], crosses: curCrosses}`

#### Pair
**Usage:**  `env.pair`

#### Current Momentum
**Usage:**  `var momentum = env.curMomentum({averagePeriod: 5000, momentumPeriod: 3000});`

The momentum value of the pair for the specified momentum pair.

#### Current Simple Moving Average
**Usage:**  `var sma = env.curSma({period: 5000});`

The moving average for the pair of the specified period.

#### Current SMA Cross Status
**Usage:**  `var crossStatus = env.curCrossStatus({period: 30, compPeriod, 300});`

Returns true if the average with a period of `compPeriod` is greater than the average with a period of `period`.

#### Tick
**Usage:** Current tick:  `env.fetch.tick({cur: true}).then(tick=>{...});`

Arbitrary tick:  `env.fetch.tick({pair: pair, timestamp: timestamp}).then(tick=>{...});`

### Actions

Actions are functions that perform an action on a position or some aspect of the bot.  They provide an interface to the position in which a condition is being evaluted.

#### resizePosition

This changes the size of a position.

**Usage:**

```
var resizePromise = actions.resizePosition(1.25);
resizePromise.then(()=>{
  //after the position has been resized on the database and broker level
});
```

##### Parameters
- `multiplier: n` -  the current size of the position is multiplied by this number.  A value of 0 will close the entire position, 2 will double it, 1.5 will increase it by 50%, etc.

#### closePosition

Closes a postion with the broker and removes it from the database.  It returns a promise that resolves once the position has been removed from both the database and closed on the broker.

**Usage:**  `actions.closePosition();`

### State

This contains various data about the state of the position.

State is just an object, so anything can be stored in here.  It can be accessed via the `state` object which is passsed into all condition functions.  Here is an example of a condition function and how to store and access an object stored in a position's state:

```
(env, state, act)=>{
  if(state.curIt){
    state.curIt++;
  }else{
    state.curIt = 0;
  }

  if(state.curIt > 500){
    act.closePosition();
  }
}
```
