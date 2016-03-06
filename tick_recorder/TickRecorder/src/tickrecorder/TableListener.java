package tickrecorder;

import com.fxcore2.*;

public class TableListener implements IO2GTableListener {
    public void onAdded(String string, O2GRow o2grow){
        
    }
    
    public void onChanged(String rowID, O2GRow rowData){
        O2GOfferTableRow offerTableRow = (O2GOfferTableRow)(rowData);
        if (offerTableRow!=null)
            System.out.println("Instrument = " + offerTableRow.getInstrument() + "; Bid = " + offerTableRow.getBid() + "; Ask = " + offerTableRow.getAsk());
    }
    
    public void onDeleted(String string, O2GRow o2grow){
        
    }
    
    public void onStatusChanged(O2GTableStatus ogts){
    
    }
}
