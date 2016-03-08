package tickrecorder;

import redis.clients.jedis.*;
import org.json.simple.*;
import org.json.simple.parser.*;
import com.fxcore2.*;
import java.util.Calendar;
import java.util.Date;

public class redisPubsubListener extends JedisPubSub {
    O2GSession session;
    
    public redisPubsubListener(O2GSession session){
        this.session = session;
    }
        
    public void onMessage(String channel, String message){
        JSONParser parser = new JSONParser();
        Object parsed;
        JSONArray array = null;
        
        try{
            parsed = parser.parse(message);
            array = (JSONArray)parsed;
        }catch(ParseException e){
            System.out.println("Error parsing JSON message: " + message);
            System.out.println("Error found at " + String.valueOf(e.getPosition()));
        }
        
        if(channel == "historyRequests"){ //JSON format should be this: "[{Pair: "USD/CAD", startTime: 1457300020.23, endTime: 1457300025.57, resolution: t1}]"
            JSONObject realParsed = (JSONObject)array.get(0);
            String pair = (String)realParsed.get("pair");
            long startTimeNum = (Long)realParsed.get("startTime");
            long endTimeNum = (Long)realParsed.get("endTime");
            String resolution = (String)realParsed.get("resolution");
            
            Date startTimeDate = new Date(startTimeNum);
            Date endTimeDate = new Date(endTimeNum);
            
            Calendar startTime = Calendar.getInstance();
            startTime.setTime(startTimeDate);
            Calendar endTime = Calendar.getInstance();
            endTime.setTime(endTimeDate);
            HistoryDownloader.downloadHistory(session, pair, resolution, startTime, endTime);
        }
    }
}
