package app.footly.android;

import android.app.*;
import android.content.*;
import android.os.Build;
import androidx.work.*;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.firestore.*;
import java.util.concurrent.TimeUnit;

public final class Alerts {
 static android.content.SharedPreferences prefs(Context c){return c.getSharedPreferences("alerts",Context.MODE_PRIVATE);}
 static String uid(){return FirebaseAuth.getInstance().getUid();}
 static boolean enabled(Context c,String user){return user!=null&&prefs(c).getBoolean(user+":enabled",false);}
 static boolean allowed(Context c){return c.getSystemService(NotificationManager.class).areNotificationsEnabled();}
 static void channels(Context c){
  NotificationManager n=c.getSystemService(NotificationManager.class);
  n.createNotificationChannel(new NotificationChannel("matches","Match updates",NotificationManager.IMPORTANCE_DEFAULT));
  n.createNotificationChannel(new NotificationChannel("community","Community activity",NotificationManager.IMPORTANCE_DEFAULT));
 }
 static void enable(Context c,boolean value){
  String user=uid();if(user==null)return;
  var reset=prefs(c).edit();for(String key:prefs(c).getAll().keySet())if(key.startsWith(user+":match:")||key.equals(user+":community"))reset.remove(key);reset.apply();
  prefs(c).edit().putBoolean(user+":enabled",value).putLong(user+":since",System.currentTimeMillis()).apply();
  WorkManager w=WorkManager.getInstance(c);
  w.cancelUniqueWork("footly-alerts");
  if(value){
   Constraints constraints=new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
   w.enqueueUniquePeriodicWork("footly-alerts",ExistingPeriodicWorkPolicy.UPDATE,new PeriodicWorkRequest.Builder(AlertWorker.class,30,TimeUnit.MINUTES).setConstraints(constraints).build());
  }else c.getSystemService(NotificationManager.class).cancelAll();
 }
 static void logout(Context c){enable(c,false);c.getSystemService(NotificationManager.class).cancelAll();}
 static synchronized void consume(Context c,String user,QuerySnapshot matches,QuerySnapshot posts){
  if(!user.equals(uid())||!enabled(c,user)||!allowed(c))return;
  var p=prefs(c);var edit=p.edit();long since=p.getLong(user+":since",System.currentTimeMillis());
  if(matches!=null)for(DocumentSnapshot d:matches){
   String key=user+":match:"+d.getId();long rev=d.getLong("revision")==null?0:d.getLong("revision");
   long old=p.getLong(key,-1);long created=d.getTimestamp("createdAt")==null?0:d.getTimestamp("createdAt").toDate().getTime();
   if((old>=0&&old!=rev)||(old<0&&created>since))send(c,"matches",d.getId(),d.getString("home")+" "+number(d,"homeScore")+" – "+number(d,"awayScore")+" "+d.getString("away"),"Your match has been updated.");
   edit.putLong(key,rev);
  }
  if(posts!=null){
   long last=p.getLong(user+":community",since),next=last;int count=0;
   for(DocumentSnapshot d:posts){long time=d.getTimestamp("createdAt")==null?0:d.getTimestamp("createdAt").toDate().getTime();next=Math.max(next,time);if(time>last&&!user.equals(d.getString("authorId")))count++;}
   if(count>0)send(c,"community","community",count+" new community "+(count==1?"post":"posts"),"Open Footly to see the conversation.");
   edit.putLong(user+":community",next);
  }
  edit.apply();
 }
 static long number(DocumentSnapshot d,String key){Long n=d.getLong(key);return n==null?0:n;}
 static void send(Context c,String channel,String id,String title,String text){
  Intent intent=new Intent(c,MainActivity.class).putExtra("screen",channel).putExtra("matchId",id).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
  PendingIntent tap=PendingIntent.getActivity(c,(channel+id).hashCode(),intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  Notification publicVersion=new Notification.Builder(c,channel).setSmallIcon(R.drawable.ic_notification).setContentTitle("Footly update").setContentText("Open Footly to view.").build();
  Notification n=new Notification.Builder(c,channel).setSmallIcon(R.drawable.ic_notification).setContentTitle(title).setContentText(text).setContentIntent(tap).setAutoCancel(true).setVisibility(Notification.VISIBILITY_PRIVATE).setPublicVersion(publicVersion).build();
  try{c.getSystemService(NotificationManager.class).notify((channel+id).hashCode(),n);}catch(SecurityException ignored){}
 }
}
