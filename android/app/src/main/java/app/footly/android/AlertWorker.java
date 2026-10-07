package app.footly.android;
import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.*;
import com.google.android.gms.tasks.Tasks;
import com.google.firebase.firestore.*;
import java.util.concurrent.TimeUnit;
public class AlertWorker extends Worker {
 public AlertWorker(@NonNull Context c,@NonNull WorkerParameters p){super(c,p);}
 @NonNull public Result doWork(){
  Context c=getApplicationContext();String user=Alerts.uid();
  if(user==null||!Alerts.enabled(c,user)||!Alerts.allowed(c))return Result.success();
  try{
   FirebaseFirestore db=FirebaseFirestore.getInstance();
   QuerySnapshot matches=Tasks.await(db.collection("matches").whereEqualTo("organizerId",user).orderBy("createdAt",Query.Direction.DESCENDING).limit(20).get(Source.SERVER),25,TimeUnit.SECONDS);
   QuerySnapshot posts=Tasks.await(db.collection("communityPosts").orderBy("createdAt",Query.Direction.DESCENDING).limit(20).get(Source.SERVER),25,TimeUnit.SECONDS);
   if(user.equals(Alerts.uid()))Alerts.consume(c,user,matches,posts);
   return Result.success();
  }catch(Exception e){return getRunAttemptCount()<3?Result.retry():Result.failure();}
 }
}
