# Algobot 3

## **Important Note**
This is version 3 of my algorithmic trading platform, the second of which is written primarily in NodeJS.  It is **not** in a working condition and was a sort of prototype for future revisions of the algobot platform.

Future revisions of the platform are listed below:

1. [algobot 1](https://github.com/Ameobea/algobot)
2. [Algobot-elixir](https://github.com/Ameobea/algobot_elixir)
3. bot3 (this repository)
4. [bot4/Rustbot](https://github.com/Ameobea/bot4)

----

## Overview
Algobot 3 is an algorithmic trading bot that attempts to turn a profit by evaluating market conditions in FX markets and placing trades based on calculations.

It consists of a platform that processes live ticks, a backtesting system that enables fast testing of strategies, a manager web interface to monitor and control the bot, and a trade generator that uses modular strategies to place, manage, and close positions dynamically.

## Platform
The platform is writte in NodeJS.  It consists of a tick generator which processes incoming data and sends it to the algorithm core module.  There, all of the necessary calculations are run on the data.  Once they have been completed, this new data is sent to the trade generator for evaluation.

The bot is designed to run using live ticks.  These are processed internally into larger time-frames as to avoid unecessary calcuations and database usage.

Multiple currency pairs can be monitored at the same time either using one instance of the tick processor or many as generated using the manager web interface.  Each pair is handled individually from the others with data being kept separate from the bot's perspective.

## Backtests
Each backtest is run on one pair at a time.  They read saved tick data in CSV format that can be created using utilities in the `data_downloaders` directory.  These ticks are played back to the bot in a variety of fashions with the end effect of simulating a live trading situation.

There are several types of backtests avaliable to the bot, each offering different benefits.

### Live Backtest
Ticks are played back at the rate they were recieved.

This is the closest estimation actual bot performance avaliable and is best suited to mirror live trading conditions as closely as possible.

### Fast Backtest
Ticks are played back at a constant rate.  The rate they are sent at increases until CPU usage is too high, at which point they will be reduced to maintain equlibrium.

This kind of backtest is best suited for testing the bot's tick processing capabilities over an extended period of time as rapidly.

### Pre-calculated Backtest
Pre-calculated backtests rely on a fast or live backtest being previously run.  After that, the database is dumped to file.  This database dump must be restored before the pre-calculted backtest can begin.

Instead of parsing ticks in an event-based fashion, the calculations and price updates are loaded from the database as a chunk.  All calculations from one price update period are then packaged up together and sent to the trade generator.

This style of backtest is best suited for evaluating changes to an already created strategy over the same time period.  It is the fastest backtest per tick as no calculations have to be run except those that are part of the trading strategy itself.

### No-store Backtest
The largest bottleneck to the bot's performance is the database.  Reading to and writing from the database takes up the vast majority of the bot's CPU time during normal execution.

In a no-store backtest, ticks are sent to the bot in an event-based fashion.  As soon as the bot finishes the calculations and evalutes the strategy for a particular tick, it sends a message back to the backtester requesting the next tick.

In addition, no data is stored in the database (except for some trade states and other strategy-based data); all calculations are kept in-memory internally.

This backtest is best suited for testing a strategy's performance over new data or data that has not been perviously tested.  Since a pre-calculated backtest relies on a fast or live backtest's results, this makes the no-store backtest the fastest option for testing a strategy from scratch.

## Manager
The manager is a web interface that allows a user to control and manage the bot.  The best way to start the bot is with `node app.js -m`, which launches only the manager web interface without any tick processing capabilities or backtests.

To start a backtest, first tick processor instances should be launched to handle all of the pairs that are planning on being tested and then starting backtests for each of those pairs.

Monitoring of execution is avaliable for live data as well as live, fast, and pre-calculated backtests.  Analysis of backtest performance is planned.

## Trade Generator
The trade generator is a container that evaluates modularly defined strategies.  Every price update, the newest calculations and market conditions are piped to the trade generator which in turn sends them to all strategies and open position condition functions.  (For more information about this process, see documentation in the `trade_generator` directory).

## Data Downloaders
The data downloaders are used for obtaining historical data with which to run backtests.  This data can come from many sources including broker APIs, websites, or flatfile storage.

### FXCM
The FXCM data downloader uses the FXCM API in combination with the `tick_recorder` server to request data and store it to a csv.  To use, first start up the `tick_recorder/TickRecorder` Java application.  Once it has started, edit the `download.js` file and set the start time, stop time, pair, and other configuration options.  To begin the download process, run `node download.js`.

Once the download finishes, run the script `./process.sh output/nameofcsv.csv`.  This will remove any duplicates that may have ended up in the csv as well as sort it.  Due to the fact that the download process was made somewhat asynchronous to speed up download times, ticks can be written out of order making sorting necessary.

In addition to sorting and removing duplicates, the `chunker.py` script is also called which splits the csv into smaller csvs and produces `index.csv` in the `tick_data` directory.  At this point, the data is in a format appropriate for backtesting.

### Dukascopy
This script was originally the primary source of tick data for the bot.  It worked by downloading compressed tick segments from Dukascopy's website which were then decompressed, organized, parsed, and saved to csv.

The quality of ticks as well as the ease of their aquisition is worse than the FXCM method, making this tick source obsolete.
