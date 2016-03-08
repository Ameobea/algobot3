package tickrecorder;

import com.fxcore2.*;

public class ResponseListener implements IO2GResponseListener {
    private String requestID;
    private O2GSession session;
    
    public void onRequestCompleted(String requestID, O2GResponse ogr){
        System.out.println("New Response recieved of type " + ogr.getType().toString() + ": " + ogr.toString());
        O2GResponseReaderFactory readerFactory = session.getResponseReaderFactory();
        if(ogr.getType().toString() == "MARKET_DATA_SNAPSHOT"){
            O2GMarketDataSnapshotResponseReader marketSnapshotReader = readerFactory.createMarketDataSnapshotReader(ogr);
            for (int i = 0; i < marketSnapshotReader.size(); i++) {
                String response = "{type: \"tick\", id: \"" + requestID;
                response += "\", timestamp: ";
                response += String.valueOf(marketSnapshotReader.getDate(i).getTimeInMillis() / 1000);
                response += ", bid: ";
                response += String.valueOf(marketSnapshotReader.getBid(i));
                response += ", ask: ";
                response += String.valueOf(marketSnapshotReader.getAsk(i));
                response += "}";
                TickRecorder.redisPublish("historicalPrices", response);
            }
        }
    }

    public void onRequestFailed(String string, String err){
        System.out.println("Request failed with error " + err);
    }

    public void onTablesUpdates(O2GResponse ogr){
        
    }
    
    public ResponseListener(O2GSession session){
        this.session = session;
    }
    
    public void setRequestID(String requestID){
        this.requestID = requestID;
    }
}
