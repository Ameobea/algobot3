# Broker API Format

Since it is necessary to be able to switch between different brokers without having to re-write all of the API code that connects them to the bot, a modularized approach is taken.  

Each broker module has a set of functions that must be implemented.  These are the same for all the broker modules that are created including the internal backtesting broker module.  Each one of the below functions must be created and linked correctly with the brokers.

## createPosition(pair, size, type, {opts})

Opens a position on the broker and returns a promise which contains information about the execution of the position and a unique position id that resolves once it has been completed.  

## getOpenPostions()

Returns a promise that fulfills an array of all open positions with that broker.  

### Returned array format

[
  {id: «some sort of unique position id», pair: 'eurusd', openTime: «second-level unix timestamp with decimal», size: «size of position in contracts»}
  ...
]

## closePosition(id)

Closes a position with the broker.  This returns a promise that fulfills once the position has been confirmed to be closed.
