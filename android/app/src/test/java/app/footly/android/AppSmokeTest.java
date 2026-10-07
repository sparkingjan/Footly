package app.footly.android;
import org.junit.*;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;
import android.app.NotificationManager;
import android.content.Context;
import android.widget.*;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class)
@Config(sdk=34)
public class AppSmokeTest {
 @After public void resetFirebase(){com.google.firebase.firestore.FirebaseFirestore.getInstance().terminate();com.google.firebase.FirebaseApp.getInstance().delete();}
 @Test public void signedOutHomeShowsNativeLoginAndLogo(){
  var activity=Robolectric.buildActivity(MainActivity.class).setup().get();
  org.robolectric.Shadows.shadowOf(android.os.Looper.getMainLooper()).idle();
  assertNotNull(activity.root);assertEquals(0,activity.getWindow().getDecorView().getVisibility());
  assertTrue(find(activity.root,"Sign in"));assertTrue(find(activity.root,"Create an account"));
  click(activity.root,"Sign in");assertTrue(find(activity.root,"Sign in"));
 }
 @Test public void createsSeparateNotificationChannels(){
  Context c=RuntimeEnvironment.getApplication();Alerts.channels(c);
  NotificationManager n=c.getSystemService(NotificationManager.class);
  assertNotNull(n.getNotificationChannel("matches"));assertNotNull(n.getNotificationChannel("community"));
 }
 boolean click(android.view.View v,String value){if(v instanceof android.widget.Button&&value.contentEquals(((TextView)v).getText())){v.performClick();return true;}if(v instanceof android.view.ViewGroup){var g=(android.view.ViewGroup)v;for(int i=0;i<g.getChildCount();i++)if(click(g.getChildAt(i),value))return true;}return false;}
 boolean find(android.view.View v,String value){if(v instanceof TextView&&value.contentEquals(((TextView)v).getText()))return true;if(v instanceof android.view.ViewGroup){var g=(android.view.ViewGroup)v;for(int i=0;i<g.getChildCount();i++)if(find(g.getChildAt(i),value))return true;}return false;}
}
