# Moving Average Cross Strategy #1

## Overview

This strategy uses a combination of moving average cross and momentum analysis to determine the starts and ends of trends.  It uses moving average crosses to determine when trends start, and momentum analysis to determine when they end.  

## Breakdown

Determining a trend is rather easy.  You simply look for a cross of a high-ish period moving average and, if the cross holds for a long enough period of time, that's a trend.  However, due to the laggy nature of moving averages, it can be difficult to determine the end of a trend before the market has already moved significantly in the other direction.  

When a moving average cross occurs, a trade is made.  That trade is then held until the point when the rate of increase/decrease of the momentum reverses contrary to the direction of the trend.  At this point, the trade is closed.  

By this method, two signals are used which removes a binary buy/sell tendency for the strategy.  This helps to reduce overtrading and cut down on noisy signals.  

## Parameters

As input, this momentum takes the following: 

 - Moving average cross status *(boolean; true = above, false = below)*
 - Momentum (decimal)
 - bid (decimal)
 - ask (decimal)

The periods of these moving averages are discretionary.  If you want to configure them in the strategy, you can use the pre-configured `mac1.config` or feed the raw data in yourself.
