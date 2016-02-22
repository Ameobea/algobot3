/*
Public Configuration Settings

These are general bot settings that govern how the bot works.  What exists here can
be though of a default options and should be committed to the repository.
*/

var public = exports;

// "dev" for development, "prod" for live
public.environment = "dev";

public.managerServerIP = "new.ameobea.me";
public.managerServerPort = 3002;

public.tickDataDirectory = "/var/algobot3/tick_data/";

/* After this number of backtest iterations, a request will be made to the database to
verify that the backtest has not been cancelled. */
public.fastBacktestCheckInterval = 100;
public.liveBacktestCheckInterval = 5;
