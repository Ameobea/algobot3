# Trading Strategies

Trading strategies are the logic that the trading bot uses to determine when and how to open, change, and close positions.  Data from the rest of the bot is evaluated and used to make these determinations.  Multiple strategies can run at once.

## Format

Strategies are separated into different modules.  Each module contains certain functions that enable the bot to interface with it.  The following functions must be included in every strategy module:

### eachUpdate(data, db)

This function is called on each price update that the bot processes once all calculations for that update have been completed.  Its responsibility is to process data from the bot and determine when a trade should be opened.  Data is an object containing data from the bot.  Check ../tradeManager/tradeManager.md for more information about this object and the environment object returned from  the `conditionEnvironment` module.

If the strategy determines that a position should be opened, it can do this by calling the `openPosition()` function from `ledger.js`.  
