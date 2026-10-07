package app.footly.android;
import android.app.Application;
import com.google.firebase.*;
import com.google.firebase.firestore.*;
public class FootlyApp extends Application {
 public void onCreate(){super.onCreate();
 FirebaseApp.initializeApp(this,new FirebaseOptions.Builder().setApplicationId("1:454859567487:android:0ff81e5449085bbf206a4a").setApiKey("AIzaSyDGKFQbuhp6ws9GTjCQNc8-xmMJw5BbGEU").setProjectId("footly-b4c3e").setGcmSenderId("454859567487").build());
 FirebaseFirestore.getInstance().setFirestoreSettings(new FirebaseFirestoreSettings.Builder().setLocalCacheSettings(MemoryCacheSettings.newBuilder().build()).build());
 Alerts.channels(this);
 }
}