package app.footly.android;
import org.junit.*;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebSettings;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class)
@Config(sdk=34)
public class AppSmokeTest {
 @After public void resetFirebase(){com.google.firebase.firestore.FirebaseFirestore.getInstance().terminate();com.google.firebase.FirebaseApp.getInstance().delete();}
 @Test public void opensExactWebsiteWithInlineVideoAndRestrictedAccess(){
  var controller=Robolectric.buildActivity(MainActivity.class).setup();var activity=controller.get();
  assertEquals("https://footlysj.vercel.app/",activity.web.getUrl());
  assertTrue(activity.web.getSettings().getJavaScriptEnabled());
  assertTrue(activity.web.getSettings().getDomStorageEnabled());
  assertFalse(activity.web.getSettings().getMediaPlaybackRequiresUserGesture());
  assertFalse(activity.web.getSettings().getAllowFileAccess());
  assertEquals(WebSettings.MIXED_CONTENT_NEVER_ALLOW,activity.web.getSettings().getMixedContentMode());
  controller.pause().stop().destroy();
 }
 @Test public void onlyTrustsExactHttpsOrigin(){
  assertTrue(MainActivity.trusted(Uri.parse("https://footlysj.vercel.app/profile.html")));
  for(String url:new String[]{"http://footlysj.vercel.app/","https://footlysj.vercel.app.evil.test/","file:///etc/passwd","https://user@footlysj.vercel.app/","https://footlysj.vercel.app:1234/","https://evil.test/"})assertFalse(url,MainActivity.trusted(Uri.parse(url)));
 }
 @Test public void notificationRoutesCannotSupplyArbitraryUrls(){
  assertEquals("https://footlysj.vercel.app/community.html",MainActivity.notificationUrl(new Intent().putExtra("screen","community")));
  assertEquals("https://footlysj.vercel.app/",MainActivity.notificationUrl(new Intent().putExtra("screen","https://evil.test")));
 }
 @Test public void createsSeparateNotificationChannels(){
  Context c=RuntimeEnvironment.getApplication();Alerts.channels(c);
  NotificationManager n=c.getSystemService(NotificationManager.class);
  assertNotNull(n.getNotificationChannel("matches"));assertNotNull(n.getNotificationChannel("community"));
 }
}
