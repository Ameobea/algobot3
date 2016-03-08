package tickrecorder;

import com.fxcore2.*;
import java.util.Calendar;

public class HistoryDownloader {
    public static void downloadHistory(O2GSession session, String pair, String resolution, Calendar startTime, Calendar endTime){
        O2GRequestFactory factory = session.getRequestFactory();
        O2GTimeframeCollection timeFrames = factory.getTimeFrameCollection();
        System.out.println("Available time frames: ");
        for(int i=0;i<timeFrames.size(); i++){
            System.out.println(timeFrames.get(i).getId());
        }
        O2GTimeframe timeFrame = timeFrames.get(resolution);
        O2GRequest marketDataRequest = factory.createMarketDataSnapshotRequestInstrument(pair, timeFrame, 300);
        factory.fillMarketDataSnapshotRequestTime(marketDataRequest, startTime, endTime, true);
        TickRecorder.redisPublish("historicalPrices", "{type: \"chunkID\", id: \"" + marketDataRequest.getRequestId() + "\"}");
        session.sendRequest(marketDataRequest);
    }
}