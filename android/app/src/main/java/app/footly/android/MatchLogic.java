package app.footly.android;
import java.util.*;
public final class MatchLogic {
 public static Map<String,Object> eventUpdate(Map<String,Object> match,Map<String,Object> event){
  String side=String.valueOf(event.get("side"));
  if(!List.of("home","away").contains(side))throw new IllegalArgumentException("Choose a team.");
  int minute=((Number)event.get("minute")).intValue();
  if(minute<0||minute>300)throw new IllegalArgumentException("Minute must be 0–300.");
  List<Map<String,Object>> events=new ArrayList<>((List<Map<String,Object>>)match.getOrDefault("events",List.of()));
  if(events.size()>=500)throw new IllegalArgumentException("The 500-event limit has been reached.");
  events.add(event);
  long home=((Number)match.getOrDefault("homeScore",0)).longValue(),away=((Number)match.getOrDefault("awayScore",0)).longValue();
  if("goal".equals(event.get("type"))){if(side.equals("home"))home++;else away++;}
  if(home>500||away>500)throw new IllegalArgumentException("Score limit reached.");
  Map<String,Object> next=new HashMap<>();
  next.put("events",events);next.put("homeScore",home);next.put("awayScore",away);next.put("minute",minute);
  next.put("schemaVersion",match.getOrDefault("schemaVersion",2));
  next.put("revision",((Number)match.getOrDefault("revision",0)).longValue()+1);
  return next;
 }
}
