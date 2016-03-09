package tickrecorder;

import com.fxcore2.*;
import java.util.Calendar;
import java.math.BigDecimal;

public class ResponseListener implements IO2GResponseListener {
    private String requestID;
    private O2GSession session;
    
    public void onRequestCompleted(String requestID, O2GResponse ogr){
        System.out.println("New Response recieved of type " + ogr.getType().toString() + ": " + ogr.toString());
        O2GResponseReaderFactory readerFactory = session.getResponseReaderFactory();
        if(ogr.getType().toString() == "MARKET_DATA_SNAPSHOT"){
            O2GMarketDataSnapshotResponseReader marketSnapshotReader = readerFactory.createMarketDataSnapshotReader(ogr);
            Long lastTimestamp = null;
            
            for (int i = 0; i < marketSnapshotReader.size(); i++) {
                String response = "{\"type\": \"tick";//\", \"id\": \"" + requestID;
                response += "\", \"timestamp\": ";
                Calendar timestampCalendar = marketSnapshotReader.getDate(i);
                lastTimestamp = timestampCalendar.getTimeInMillis();
                response += String.valueOf(lastTimestamp);
                response += ", \"bid\": ";
                response += String.valueOf(marketSnapshotReader.getBid(i));
                response += ", \"ask\": ";
                response += String.valueOf(marketSnapshotReader.getAsk(i));
                response += "}";
                TickRecorder.redisPublish("historicalPrices", response);
            }
            TickRecorder.redisPublish("historicalPrices", "{\"status\": \"segmentDone\", \"lastTimestamp\": " + String.valueOf(lastTimestamp) + "}");
        }
    }

    public void onRequestFailed(String string, String err){
        System.out.println("Request failed with error " + err);
        if(err.contains("unsupported scope")){
            TickRecorder.redisPublish("historicalPrices", "{\"error\": \"error: no ticks found in that range.\"}");
        }
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
