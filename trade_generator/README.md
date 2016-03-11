# Algobot Trading Engine

This module uses data from the rest of the bot to determine when to enter and exit trades.  It determines the entry/exit points times and prices as well as a probability of success used for the calculations of how large to make the position.  

## Submodules

### Generator
Decided whether the calculations from the bot mean buy or sell.  Basically parses the data and returns the following things if it believes a trade is possible:
1. Pair
2. Long/Short
3. Entry Price
4. Exit Price/condition data
5. Estimated success chance
 
Exit Price/condition data can take a variety of forms.  For some trades, it may be best to have the bot reduce position size as certain events come to pass.  For others, it may be best to close it all at once, etc.

### Ledger
Keeps track of open trades and balance for the trading account.  Either uses broker API or simulates a ledger.  

### Trade Size
Implements an investment strategy to determine how large to make positions and how to manage positions while they're open.  Will talk to the ledger to determine necessary data about balance.  

I want to use the Kelley Criterion to determine trade size.  Probability from the generator module will be the primay output, and expected gains/losses should also be factored into the calculation.  An additional setting for tolerated risk should also be added.

## Notes/TODO
**TODO: Simulate all maxima/minima stripe pairs as well as momentum pairs simultaneously to determine which pairs are the best for the current market.`**
