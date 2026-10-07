package app.footly.android;
import org.junit.Test;
import static org.junit.Assert.*;
import java.util.*;
public class MatchLogicTest {
 Map<String,Object> match(){return Map.of("homeScore",1,"awayScore",2,"revision",4,"schemaVersion",3,"events",List.of());}
 Map<String,Object> event(String side,String type,int minute){return Map.of("side",side,"type",type,"minute",minute,"playerId","registered-uid","player","Alex");}
 @Test public void goalPreservesOtherSideAndPlayerIdentity(){var next=MatchLogic.eventUpdate(match(),event("away","goal",8));assertEquals(1L,next.get("homeScore"));assertEquals(3L,next.get("awayScore"));assertEquals(5L,next.get("revision"));assertEquals("registered-uid",((List<Map<String,Object>>)next.get("events")).get(0).get("playerId"));}
 @Test public void cardDoesNotChangeScore(){var next=MatchLogic.eventUpdate(match(),event("home","yellow",12));assertEquals(1L,next.get("homeScore"));assertEquals(2L,next.get("awayScore"));}
 @Test public void rejectsInvalidMinuteAndSide(){assertThrows(IllegalArgumentException.class,()->MatchLogic.eventUpdate(match(),event("home","goal",301)));assertThrows(IllegalArgumentException.class,()->MatchLogic.eventUpdate(match(),event("unknown","goal",1)));}
 @Test public void preventsEventOverflow(){var m=new HashMap<>(match());m.put("events",Collections.nCopies(500,event("home","goal",1)));assertThrows(IllegalArgumentException.class,()->MatchLogic.eventUpdate(m,event("home","goal",1)));}
}
