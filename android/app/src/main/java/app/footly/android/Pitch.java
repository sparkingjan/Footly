package app.footly.android;
import android.content.Context;
import android.graphics.*;
import android.view.*;
import java.util.*;
public class Pitch extends View {
 final List<Map<String,Object>> players;final boolean editable;final Paint pen=new Paint(Paint.ANTI_ALIAS_FLAG);Map<String,Object> dragged;
 public Pitch(Context c){this(c,new ArrayList<>(),false);}
 public Pitch(Context c,List<Map<String,Object>> p,boolean edit){super(c);players=p;editable=edit;setContentDescription(edit?"Football position map. Drag a player to move them. Roles can also be selected below.":"Football lineup. Player names and roles are listed below.");setFocusable(true);}
 float x(Map<String,Object> p){return ((Number)p.getOrDefault("x",50)).floatValue()/100*getWidth();}
 float y(Map<String,Object> p){return ((Number)p.getOrDefault("y",50)).floatValue()/100*getHeight();}
 @Override protected void onDraw(Canvas c){super.onDraw(c);float w=getWidth(),h=getHeight(),scale=getResources().getDisplayMetrics().density;c.drawColor(Color.rgb(39,100,73));pen.setColor(Color.argb(130,255,255,255));pen.setStyle(Paint.Style.STROKE);pen.setStrokeWidth(2);c.drawRect(10,10,w-10,h-10,pen);c.drawLine(10,h/2,w-10,h/2,pen);c.drawCircle(w/2,h/2,w*.16f,pen);c.drawRect(w*.28f,10,w*.72f,h*.17f,pen);c.drawRect(w*.28f,h*.83f,w*.72f,h-10,pen);pen.setStyle(Paint.Style.FILL);
 for(var p:players){float px=x(p),py=y(p);pen.setColor(Color.rgb(216,255,98));c.drawCircle(px,py,18*scale,pen);pen.setColor(Color.rgb(21,40,32));pen.setTextSize(14*scale);pen.setTextAlign(Paint.Align.CENTER);String name=String.valueOf(p.get("name"));c.drawText(name.isEmpty()?"?":name.substring(0,1).toUpperCase(Locale.getDefault()),px,py+5*scale,pen);pen.setColor(Color.WHITE);pen.setTextSize(11*scale);c.drawText(name.length()>12?name.substring(0,12):name,px,py+30*scale,pen);}
 }
 @Override public boolean onTouchEvent(android.view.MotionEvent e){if(!editable)return super.onTouchEvent(e);
  switch(e.getActionMasked()){
   case MotionEvent.ACTION_DOWN:for(var p:players)if(Math.hypot(x(p)-e.getX(),y(p)-e.getY())<28*getResources().getDisplayMetrics().density){dragged=p;getParent().requestDisallowInterceptTouchEvent(true);return true;}return false;
   case MotionEvent.ACTION_MOVE:if(dragged!=null){dragged.put("x",Math.max(10d,Math.min(90d,e.getX()/getWidth()*100)));dragged.put("y",Math.max(9d,Math.min(88d,e.getY()/getHeight()*100)));invalidate();return true;}break;
   case MotionEvent.ACTION_UP:case MotionEvent.ACTION_CANCEL:dragged=null;getParent().requestDisallowInterceptTouchEvent(false);performClick();return true;
  }return true;
 }
 @Override public boolean performClick(){super.performClick();return true;}
}
