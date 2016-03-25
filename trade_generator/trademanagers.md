# Trade Manager Documentation

The trade manager module is the part of the bot that deals with currently open positions or requests to open positions.  Since you're usually going to want to do something with an open position at some point, trade manager exists to do that for you.

For each member of the openPositions collection, a subdocument called `manage` exists which contains a list of conditions that the trade manager uses to act upon that position.  

## Manage Document Reference

See https://drive.google.com/file/d/0Bw3Lu3S0XCdOTEJIXzJCcG1tb1U/view?usp=sharing for a diagram of the database schema.

### Overview

When creating a position, there are several parts that are included.  The first is the position data itself, which contains information such as the initial size of the position, the pair, the timestamp, etc.  

In addition, three other pieces of data are included: State, Conditions, and Actions.  Together, these three objects allow for positions to be automatically managed on each price update.  See the below sections for a more in-depth explaniation of their functionality.  

### State

This contains various data about the state of the position.  

State is just an object, so anything can be stored in here.  It can be accessed via the `state` object which is passsed into all condition functions.  

### Conditions

The `manage` collection has a subcollection called `conditions`.  These are a set of conitions that must be met for an action to be taken.  

They are passed in as functions.  Each of these conditions are evaluted on each priceUpdate.  

### Creating conditions

Conditions are either created during the creation of a position in `openPosition()` or added using the function `addCondition()` in tradeManager.  Each condition is created with a name as well as an ID allowing for them to be accessed/removed programatically as well.

#### Condition Variables

Conditions have access to a variety of variables that provide information about the curren position or market data calculated by the bot.  They can be included in condition functions using the format `env.get()` which will either return a normal number/string/etc. or a promise depending on the variable.  

The following is an example of a condition function that increases the position size by 25% if the bid is lower than or equal to a value set in `state`:

```
(env, state, actions)=>{
  if(env.bid <= state.buyThreshold){
    state.buyThreshold *= .99;
    actions.resizePosition(1.25);
  }
}
```

##### bid
**Usage:**  `var bid = env.bid;`

The current bid of the pair.

##### ask
**Usage:**  `var ask = env.ask;`

The current ask price for the pair.

##### momentum
**Usage:**  

```
var momentumPromise = env.momentum({averagePeriod: 5000, momentumPeriod: 5000});
momentumPromise.then(momentum=>{
  if(momentum > 5){
    ...
  }
});
```

The momentum value of the pair for the specified momentum pair.  It returns a promise even if the momentum was included in the current priceUpdate.  

If it was not included in the current price update, the necessary database queries will be made and it will be calculated on-demand.

##### sma
**Format**: `{type: sma, period: n}`

The moving average for the pair of the specified period.  

### Actions

Actions are contained in the subdocument `actions` of every condition object in the `conditions` subdocument of `positions`.  So `positions.conditions[i].actions`.  These are performed if the condition evaluates to true.

#### resizePosition

This changes the size of a position.  

##### Parameters
- `multiplier: n` -  the current size of the position is multiplied by this number.  A value of 0 will close the entire position, 2 will double it, 1.5 will increase it by 50%, etc.
