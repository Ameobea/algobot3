# Trade Manager Documentation

The trade manager module is the part of the bot that deals with currently open positions or requests to open positions.  Since you're usually going to want to do something with an open position at some point, trade manager exists to do that for you.

For each member of the openPositions collection, a subdocument called `manage` exists which contains a list of conditions that the trade manager uses to act upon that position.  

## Manage Document Reference

### Conditions

The `manage` collection has a subcollection called `conditions`.  These are a set of conitions that must be met for a position to be closed.  The condition is evaluated, and if it returns true the subdocument of that `condition` will be executed. 

#### price

### Actions

Actions are contained in the subdocument `actions` of every condition object in the `conditions` subdocument of `positions`.  So `positions.conditions[i].actions`.  These are performed if the condition evaluates to true.

#### resizePosition

This changes the size of a position.  

##### Parameters
- `multiplier: n` -  the current size of the position is multiplied by this number.  A value of 0 will close the entire position, 2 will double it, 1.5 will increase it by 50%, etc.
- `close: true` - this will close the position entirely.

