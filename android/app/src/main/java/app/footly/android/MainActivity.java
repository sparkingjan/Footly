package app.footly.android;
import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.net.http.SslError;
import android.os.*;
import android.text.InputType;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import androidx.webkit.*;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import com.google.firebase.auth.*;
import com.google.firebase.firestore.*;
import org.json.*;
import java.util.Set;

/** Uses the production website itself so layout, video and all features stay identical. */
public class MainActivity extends ComponentActivity {
 static final String ORIGIN="https://footlysj.vercel.app";
 WebView web;FrameLayout root;LinearLayout errorPanel;ProgressBar progress;
 ValueCallback<Uri[]> upload;String webUid="";boolean foreground;
 ListenerRegistration matches,posts;JavaScriptReplyProxy reply;
 static boolean trusted(Uri uri){return uri!=null&&"https".equals(uri.getScheme())&&"footlysj.vercel.app".equals(uri.getHost())&&(uri.getPort()==-1||uri.getPort()==443)&&uri.getUserInfo()==null;}
 @Override public void onCreate(Bundle state){
  super.onCreate(state);root=new FrameLayout(this);root.setBackgroundColor(Color.rgb(21,40,32));
  root.setOnApplyWindowInsetsListener((v,insets)->{if(Build.VERSION.SDK_INT>=30){var bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.ime());v.setPadding(bars.left,bars.top,bars.right,bars.bottom);}else v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
  setContentView(root);web=new WebView(this);
  getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){@Override public void handleOnBackPressed(){if(web.canGoBack())web.goBack();else finish();}});root.addView(web,new FrameLayout.LayoutParams(-1,-1));
  WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
  settings.setMediaPlaybackRequiresUserGesture(false);settings.setUseWideViewPort(true);settings.setLoadWithOverviewMode(true);settings.setTextZoom(100);
  settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);settings.setAllowFileAccessFromFileURLs(false);settings.setAllowUniversalAccessFromFileURLs(false);
  settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setJavaScriptCanOpenWindowsAutomatically(false);settings.setSupportMultipleWindows(false);settings.setSafeBrowsingEnabled(true);
  CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
  WebView.setWebContentsDebuggingEnabled(false);
  progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);FrameLayout.LayoutParams bar=new FrameLayout.LayoutParams(-1,6);bar.gravity=Gravity.TOP;root.addView(progress,bar);
  makeErrorPanel();
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
    Uri uri=request.getUrl();if(trusted(uri))return false;
    if(request.isForMainFrame()&&Set.of("https","http","mailto","tel").contains(String.valueOf(uri.getScheme()))){try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(ActivityNotFoundException ignored){}}
    return true;
   }
   @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap icon){progress.setVisibility(View.VISIBLE);errorPanel.setVisibility(View.GONE);}
   @Override public void onPageFinished(WebView view,String url){progress.setVisibility(View.GONE);CookieManager.getInstance().flush();}
   @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame())showError();}
   @Override public void onReceivedHttpError(WebView view,WebResourceRequest request,WebResourceResponse response){if(request.isForMainFrame()&&response.getStatusCode()>=400)showError();}
   @Override public void onReceivedSslError(WebView view,SslErrorHandler handler,SslError error){handler.cancel();showError();}
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public void onProgressChanged(WebView view,int value){progress.setProgress(value);}
   @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> result,FileChooserParams params){
    if(!trusted(Uri.parse(view.getUrl()==null?"":view.getUrl())))return false;
    if(upload!=null)upload.onReceiveValue(null);upload=result;
    Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("image/*").putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"image/jpeg","image/png","image/webp"});
    try{startActivityForResult(pick,42);}catch(ActivityNotFoundException e){upload.onReceiveValue(null);upload=null;}
    return true;
   }
  });
  if(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)){
   WebViewCompat.addWebMessageListener(web,"FootlyAndroid",Set.of(ORIGIN),(view,message,origin,mainFrame,proxy)->{
    if(!mainFrame||!trusted(origin)||message.getData()==null||message.getData().length()>2048)return;
    try{JSONObject data=new JSONObject(message.getData());reply=proxy;
     switch(data.optString("type")){
      case "session":
       String uid=data.optString("uid");if(uid.length()>128)return;webUid=uid;
       FirebaseUser nativeUser=FirebaseAuth.getInstance().getCurrentUser();
       if(nativeUser!=null&&!nativeUser.getUid().equals(uid)){Alerts.logout(this);FirebaseAuth.getInstance().signOut();stopListeners();}
       startListeners();status("");break;
      case "enable":setupAlerts();break;
      case "disable":Alerts.enable(this,false);stopListeners();status("");break;
      case "status":status("");break;
     }
    }catch(JSONException ignored){}
   });
  }
  if(state==null||web.restoreState(state)==null)web.loadUrl(notificationUrl(getIntent()));
 }
 static String notificationUrl(Intent intent){return ORIGIN+("community".equals(intent.getStringExtra("screen"))?"/community.html":"matches".equals(intent.getStringExtra("screen"))?"/live-matches.html":"/");}
 void makeErrorPanel(){
  errorPanel=new LinearLayout(this);errorPanel.setOrientation(LinearLayout.VERTICAL);errorPanel.setGravity(Gravity.CENTER);errorPanel.setPadding(40,40,40,40);errorPanel.setBackgroundColor(Color.rgb(244,246,240));
  TextView label=new TextView(this);label.setText("Footly could not connect.\nCheck your internet connection and retry.");label.setTextSize(18);label.setGravity(Gravity.CENTER);errorPanel.addView(label);
  Button retry=new Button(this);retry.setText("Retry");retry.setOnClickListener(v->{errorPanel.setVisibility(View.GONE);web.reload();});errorPanel.addView(retry);root.addView(errorPanel,new FrameLayout.LayoutParams(-1,-1));errorPanel.setVisibility(View.GONE);
 }
 void showError(){progress.setVisibility(View.GONE);errorPanel.setVisibility(View.VISIBLE);}
 void setupAlerts(){
  if(webUid.isEmpty()){status("Sign in to Footly first.");return;}
  FirebaseUser user=FirebaseAuth.getInstance().getCurrentUser();
  if(user!=null&&user.getUid().equals(webUid)){permission();return;}
  LinearLayout form=new LinearLayout(this);form.setOrientation(LinearLayout.VERTICAL);form.setPadding(40,16,40,16);
  TextView info=new TextView(this);info.setText("Sign in once with the same Footly account to enable background notifications.");form.addView(info);
  EditText email=new EditText(this);email.setHint("Email");email.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);form.addView(email);
  EditText password=new EditText(this);password.setHint("Password");password.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);form.addView(password);
  TextView error=new TextView(this);form.addView(error);
  String expected=webUid;
  AlertDialog dialog=new AlertDialog.Builder(this).setTitle("Enable Footly notifications").setView(form).setNegativeButton("Cancel",null).setPositiveButton("Sign in",null).create();
  dialog.setOnShowListener(x->dialog.getButton(-1).setOnClickListener(v->{
   String address=email.getText().toString().trim(),pass=password.getText().toString();
   if(!android.util.Patterns.EMAIL_ADDRESS.matcher(address).matches()||pass.isEmpty()){error.setText("Enter your email and password.");return;}
   dialog.getButton(-1).setEnabled(false);
   FirebaseAuth.getInstance().signInWithEmailAndPassword(address,pass).addOnCompleteListener(task->{
    password.setText("");if(!task.isSuccessful()){dialog.getButton(-1).setEnabled(true);error.setText("Could not sign in. Check your details and connection.");return;}
    FirebaseUser signed=FirebaseAuth.getInstance().getCurrentUser();
    if(signed==null||!expected.equals(webUid)||!expected.equals(signed.getUid())){Alerts.logout(this);FirebaseAuth.getInstance().signOut();dialog.getButton(-1).setEnabled(true);error.setText("Use the same account that is signed in on this page.");return;}
    dialog.dismiss();permission();
   });
  }));dialog.show();
 }
 void permission(){
  if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},7);
  else{Alerts.enable(this,true);startListeners();status(Alerts.allowed(this)?"Notifications enabled.":"Allow notifications in Android settings.");}
 }
 void status(String detail){if(reply==null)return;try{String uid=FirebaseAuth.getInstance().getUid();boolean linked=uid!=null&&uid.equals(webUid);reply.postMessage(new JSONObject().put("type","status").put("enabled",linked&&Alerts.enabled(this,uid)&&Alerts.allowed(this)).put("message",detail).toString());}catch(Exception ignored){}}
 void stopListeners(){if(matches!=null)matches.remove();if(posts!=null)posts.remove();matches=posts=null;}
 void startListeners(){
  stopListeners();String uid=FirebaseAuth.getInstance().getUid();if(!foreground||uid==null||!uid.equals(webUid)||!Alerts.enabled(this,uid))return;
  FirebaseFirestore db=FirebaseFirestore.getInstance();
  matches=db.collection("matches").whereEqualTo("organizerId",uid).orderBy("createdAt",Query.Direction.DESCENDING).limit(20).addSnapshotListener((rows,e)->{if(rows!=null&&!rows.getMetadata().isFromCache()&&uid.equals(webUid))Alerts.consume(this,uid,rows,null);});
  posts=db.collection("communityPosts").orderBy("createdAt",Query.Direction.DESCENDING).limit(20).addSnapshotListener((rows,e)->{if(rows!=null&&!rows.getMetadata().isFromCache()&&uid.equals(webUid))Alerts.consume(this,uid,null,rows);});
 }
 @Override protected void onResume(){super.onResume();foreground=true;if(web!=null)web.onResume();startListeners();}
 @Override protected void onPause(){foreground=false;stopListeners();if(web!=null){web.onPause();CookieManager.getInstance().flush();}super.onPause();}
 @Override protected void onDestroy(){stopListeners();if(upload!=null){upload.onReceiveValue(null);upload=null;}if(web!=null){root.removeView(web);web.destroy();}super.onDestroy();}
 @Override protected void onSaveInstanceState(Bundle state){super.onSaveInstanceState(state);web.saveState(state);}
 @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);web.loadUrl(notificationUrl(intent));}
 @Override public void onRequestPermissionsResult(int r,String[] p,int[] result){super.onRequestPermissionsResult(r,p,result);if(r==7){boolean granted=result.length>0&&result[0]==PackageManager.PERMISSION_GRANTED;Alerts.enable(this,granted);startListeners();status(granted?"Notifications enabled.":"Notifications are off. You can enable them in Android settings.");}}
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request!=42||upload==null)return;Uri uri=result==RESULT_OK&&data!=null?data.getData():null;if(uri!=null&&!"content".equals(uri.getScheme()))uri=null;upload.onReceiveValue(uri==null?null:new Uri[]{uri});upload=null;}
}
