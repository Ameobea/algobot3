# Binary Kelley Strategy

##Overview

This basis of this strategy is as basic as it gets.  The estimated chance of success for that trade is assumed to be a set percentage configured in the strategy options.  The estimated profit of the trade is also calculated statically using an estimation.

##Specification

The strategy operates solely on *buy* or *sell* signals.  If a signal is received and there is no currently open position for the pair, a trade is executed.  If there is a currently open position and the signal is the same as the one that produced that trade, nothing is done.  However, if the signal is the opposite, that position is closed.  

The size of the trade is generated using the Kelley criterion formula.  Since all of the factors except the size of the balance are static, a simple percentage of current equity can be used.  

##Note
This is more of an example strategy used to evaluate the success of trading signals.  As both inputs are static and trades are managed in a binary manner, 
