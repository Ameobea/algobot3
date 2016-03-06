package tickrecorder;

import com.fxcore2.*;

public class TickRecorder {

    public static void main(String[] args) {
        O2GSession mSession = O2GTransport.createSession();
        MySessionStatusListener statusListener = new MySessionStatusListener();
        mSession.subscribeSessionStatus(statusListener);
        
        TableManagerListener managerListener = new TableManagerListener();
        mSession.useTableManager(O2GTableManagerMode.YES, managerListener);
        mSession.login(Config.FXCMUsername, Config.FXCMPassword, Config.FXCMHostsURL, Config.connectionType);
        
        while (!statusListener.isConnected() && !statusListener.hasError()) {
            try{
                Thread.sleep(50);
            }catch(InterruptedException e){}
        }
        
        O2GTableManager tableManager = mSession.getTableManager();
        O2GOffersTable offersTable = (O2GOffersTable)tableManager.getTable(O2GTableType.OFFERS);
        
        O2GTableIterator iterator = new O2GTableIterator();
        O2GOfferTableRow offerTableRow = offersTable.getNextRow(iterator);
        while (offerTableRow!=null)
        {
            System.out.println("Instrument = " + offerTableRow.getInstrument() + "; Bid = " + offerTableRow.getBid() + "; Ask = " + offerTableRow.getAsk());
            offerTableRow = offersTable.getNextRow(iterator);
        }
        
        TableListener tableListener = new TableListener();
        offersTable.subscribeUpdate(O2GTableUpdateType.UPDATE, tableListener);
    }
    
}
