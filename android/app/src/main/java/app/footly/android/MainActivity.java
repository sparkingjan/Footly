package app.footly.android;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.*;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.*;
import android.text.InputType;
import android.view.*;
import android.widget.*;
import com.google.firebase.auth.*;
import com.google.firebase.firestore.*;
import java.io.*;
import java.util.*;

public class MainActivity extends Activity {
 final int INK=Color.rgb(21,40,32),GREEN=Color.rgb(39,100,73),PAPER=Color.rgb(244,246,240),LIME=Color.rgb(216,255,98);
 FirebaseAuth auth;FirebaseFirestore db;LinearLayout root,body,feed;String screen="matches",currentMatch,pendingMatch;int generation;
 ListenerRegistration matchWatch,postWatch,detailWatch;QuerySnapshot matchData,postData;
 final LinkedHashMap<String,Map<String,Object>> home=new LinkedHashMap<>(),away=new LinkedHashMap<>();
 final List<DocumentSnapshot> players=new ArrayList<>();DocumentSnapshot playerCursor;LinearLayout selection,playerList;EditText homeName,awayName,venue,date;
 String searchPrefix="";boolean saving;String uiUid;String[] draft={"Home","Away","",""};
 final FirebaseAuth.AuthStateListener accountListener=a->{stopWatches();matchData=null;postData=null;if(a.getCurrentUser()==null){uiUid=null;login();}else{boolean changed=!a.getUid().equals(uiUid);uiUid=a.getUid();ensureDirectory();startWatches();if(changed){if(pendingMatch!=null){String id=pendingMatch;pendingMatch=null;detail(id);}else navigate(screen);}else if(screen.equals("detail")&&currentMatch!=null)detail(currentMatch);}};
 int dp(float n){return (int)(n*getResources().getDisplayMetrics().density+.5f);}
 @Override public void onCreate(Bundle state){super.onCreate(state);auth=FirebaseAuth.getInstance();db=FirebaseFirestore.getInstance();if(state!=null){screen=state.getString("screen","matches");if(state.getStringArray("draft")!=null)draft=state.getStringArray("draft");if(state.getSerializable("home")!=null)home.putAll((Map<String,Map<String,Object>>)state.getSerializable("home"));if(state.getSerializable("away")!=null)away.putAll((Map<String,Map<String,Object>>)state.getSerializable("away"));pendingMatch=state.getString("currentMatch");}if(getIntent().hasExtra("screen"))screen=Objects.requireNonNullElse(getIntent().getStringExtra("screen"),"matches");String target=getIntent().getStringExtra("matchId");if("matches".equals(screen)&&target!=null&&target.matches("[A-Za-z0-9_-]{1,128}"))pendingMatch=target;}
 @Override protected void onStart(){super.onStart();auth.addAuthStateListener(accountListener);}
 @Override protected void onStop(){super.onStop();auth.removeAuthStateListener(accountListener);stopWatches();}
 @Override protected void onSaveInstanceState(Bundle out){super.onSaveInstanceState(out);out.putString("screen",screen);out.putSerializable("home",home);out.putSerializable("away",away);if(screen.equals("detail"))out.putString("currentMatch",currentMatch);if(screen.equals("create")&&homeName!=null)draft=new String[]{homeName.getText().toString(),awayName.getText().toString(),venue.getText().toString(),date.getText().toString()};out.putStringArray("draft",draft);}
 @Override protected void onNewIntent(Intent i){super.onNewIntent(i);setIntent(i);if(auth.getCurrentUser()!=null){String id=i.getStringExtra("matchId");if("matches".equals(i.getStringExtra("screen"))&&id!=null&&id.matches("[A-Za-z0-9_-]{1,128}"))detail(id);else navigate(i.getStringExtra("screen")==null?"matches":i.getStringExtra("screen"));}}
 void stopWatches(){if(matchWatch!=null)matchWatch.remove();if(postWatch!=null)postWatch.remove();if(detailWatch!=null)detailWatch.remove();matchWatch=postWatch=detailWatch=null;}
 void startWatches(){
  String uid=auth.getUid();if(uid==null)return;
  matchWatch=db.collection("matches").whereEqualTo("organizerId",uid).orderBy("createdAt",Query.Direction.DESCENDING).limit(20).addSnapshotListener((v,e)->{
   if(!uid.equals(auth.getUid()))return;if(e!=null){if(screen.equals("matches"))error(e);return;}matchData=v;
   if(v!=null&&!v.getMetadata().isFromCache())Alerts.consume(this,uid,v,null);if(screen.equals("matches"))matches();
  });
  postWatch=db.collection("communityPosts").orderBy("createdAt",Query.Direction.DESCENDING).limit(20).addSnapshotListener((v,e)->{
   if(!uid.equals(auth.getUid()))return;if(e!=null){if(screen.equals("community"))error(e);return;}postData=v;
   if(v!=null&&!v.getMetadata().isFromCache())Alerts.consume(this,uid,null,v);if(screen.equals("community"))renderPosts();
  });
 }
 void ensureDirectory(){FirebaseUser u=auth.getCurrentUser();if(u==null)return;db.collection("users").document(u.getUid()).get().addOnSuccessListener(d->{if(d.exists()&&u.getUid().equals(auth.getUid()))db.collection("registeredPlayers").document(u.getUid()).set(Map.of("displayName",Objects.requireNonNullElse(d.getString("displayName"),"Player")));});}
 GradientDrawable background(int color,int radius){GradientDrawable g=new GradientDrawable();g.setColor(color);g.setCornerRadius(dp(radius));return g;}
 LinearLayout column(){LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);return l;}
 TextView text(LinearLayout parent,String value,int size){TextView v=new TextView(this);v.setText(value);v.setTextSize(size);v.setTextColor(INK);v.setPadding(0,dp(7),0,dp(7));parent.addView(v);return v;}
 Button button(LinearLayout p,String label,Runnable action){Button b=new Button(this);b.setText(label);b.setAllCaps(false);b.setTextColor(Color.WHITE);b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(GREEN));p.addView(b,new LinearLayout.LayoutParams(-1,dp(52)));b.setOnClickListener(v->action.run());return b;}
 EditText input(LinearLayout p,String label,String initial,int type){text(p,label,12);EditText e=new EditText(this);e.setText(initial);e.setTextColor(INK);e.setTextSize(16);e.setSingleLine(true);e.setInputType(type);e.setPadding(dp(12),dp(8),dp(12),dp(8));e.setBackground(background(Color.WHITE,10));e.setContentDescription(label);p.addView(e,new LinearLayout.LayoutParams(-1,dp(50)));return e;}
 LinearLayout card(LinearLayout parent){LinearLayout c=column();c.setPadding(dp(18),dp(12),dp(18),dp(12));c.setBackground(background(Color.WHITE,18));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.setMargins(0,dp(8),0,dp(8));parent.addView(c,lp);return c;}
 void page(String title,boolean nav){
  generation++;if(detailWatch!=null){detailWatch.remove();detailWatch=null;}
  root=column();root.setBackgroundColor(PAPER);root.setOnApplyWindowInsetsListener((v,insets)->{if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.ime());v.setPadding(bars.left,bars.top,bars.right,bars.bottom);}else v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
  setContentView(root);
  LinearLayout top=new LinearLayout(this);top.setGravity(Gravity.CENTER_VERTICAL);top.setPadding(dp(18),dp(8),dp(18),dp(8));
  ImageView logo=new ImageView(this);logo.setImageResource(R.drawable.footly_logo);logo.setContentDescription("Footly");top.addView(logo,new LinearLayout.LayoutParams(dp(40),dp(40)));
  TextView name=new TextView(this);name.setText("  footly.");name.setTextSize(26);name.setTextColor(INK);name.setTypeface(null,Typeface.BOLD);top.addView(name,new LinearLayout.LayoutParams(0,-2,1));
  if(nav){Button exit=new Button(this);exit.setText("Log out");exit.setAllCaps(false);exit.setOnClickListener(v->logout());top.addView(exit);}
  root.addView(top);
  ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);body=column();body.setPadding(dp(22),dp(8),dp(22),dp(24));scroll.addView(body);root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
  TextView h=text(body,title,32);h.setTypeface(null,Typeface.BOLD);
  if(nav){LinearLayout bar=new LinearLayout(this);String[] ids={"matches","create","community","profile"},labels={"Matches","+ Match","Community","Profile"};
   for(int n=0;n<ids.length;n++){String id=ids[n];Button b=new Button(this);b.setText(labels[n]);b.setAllCaps(false);b.setTextSize(11);b.setTextColor(screen.equals(id)?GREEN:INK);bar.addView(b,new LinearLayout.LayoutParams(0,dp(56),1));b.setOnClickListener(v->navigate(id));}root.addView(bar);
  }
 }
 void navigate(String destination){screen=destination;switch(destination){case "create":createMatch();break;case "community":community();break;case "profile":profile();break;default:screen="matches";matches();}}
 void message(String s){Toast.makeText(this,s,Toast.LENGTH_LONG).show();}
 void error(Exception e){message(e==null?"Could not complete this request. Please retry.":Objects.requireNonNullElse(e.getMessage(),"Please retry."));}
 void logout(){Alerts.logout(this);stopWatches();home.clear();away.clear();players.clear();auth.signOut();}
 void login(){
  page("Your next matchday.",false);text(body,"Sign in with the same account you use on Footly.",16);
  EditText email=input(body,"Email","",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
  EditText password=input(body,"Password","",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);
  Button sign=button(body,"Sign in",()->{});
  sign.setOnClickListener(v->{if(!android.util.Patterns.EMAIL_ADDRESS.matcher(email.getText().toString().trim()).matches()||password.getText().length()==0){message("Enter your email and password.");return;}sign.setEnabled(false);auth.signInWithEmailAndPassword(email.getText().toString().trim(),password.getText().toString()).addOnCompleteListener(t->{sign.setEnabled(true);if(!t.isSuccessful())error(t.getException());});});
  button(body,"Create an account",()->signup());
  button(body,"Reset password",()->{String address=email.getText().toString().trim();if(address.isEmpty()){message("Enter your email first.");return;}auth.sendPasswordResetEmail(address).addOnCompleteListener(t->{if(t.isSuccessful())message("If that account exists, check its email for a reset link.");else error(t.getException());});});
 }
 void signup(){
  page("Join Footly.",false);EditText name=input(body,"Display name","",InputType.TYPE_CLASS_TEXT),email=input(body,"Email","",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS),pass=input(body,"Password (at least 6 characters)","",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);
  button(body,"Create account",()->{String n=name.getText().toString().trim();if(n.isEmpty()||n.length()>100){message("Enter a name under 100 characters.");return;}
   if(!android.util.Patterns.EMAIL_ADDRESS.matcher(email.getText().toString().trim()).matches()||pass.getText().length()<6){message("Enter a valid email and a password of at least 6 characters.");return;}auth.createUserWithEmailAndPassword(email.getText().toString().trim(),pass.getText().toString()).addOnSuccessListener(result->{FirebaseUser u=result.getUser();u.updateProfile(new UserProfileChangeRequest.Builder().setDisplayName(n).build());db.collection("users").document(u.getUid()).set(Map.of("email",Objects.requireNonNull(u.getEmail()),"displayName",n,"createdAt",FieldValue.serverTimestamp(),"updatedAt",FieldValue.serverTimestamp())).addOnSuccessListener(x->{ensureDirectory();navigate("matches");}).addOnFailureListener(this::error);}).addOnFailureListener(this::error);
  });button(body,"Back to sign in",this::login);
 }
 void matches(){
  page("Your matchday.",true);text(body,"Lineups, live scores and the moments that matter.",16);button(body,"Create a match",()->navigate("create"));
  if(matchData==null){text(body,"Loading matches…",16);return;}
  if(matchData.isEmpty())text(body,"No matches yet. Choose registered players and get a game started.",18);
  for(DocumentSnapshot d:matchData){LinearLayout c=card(body);text(c,d.getString("format")+"  ·  "+Objects.requireNonNullElse(d.getString("date"),""),12);text(c,d.getString("home")+"  "+Alerts.number(d,"homeScore")+" – "+Alerts.number(d,"awayScore")+"  "+d.getString("away"),22);text(c,Objects.requireNonNullElse(d.getString("venue"),"Local pitch"),14);button(c,"Open match",()->detail(d.getId()));}
  text(body,"Showing your 20 most recent matches.",12);
 }
 void community(){
  page("The touchline.",true);text(body,"The Footly community. Share a matchday moment.",16);EditText post=input(body,"Your post","",InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);post.setSingleLine(false);post.setMinLines(2);
  Button send=button(body,"Share post",()->{});send.setOnClickListener(v->{String value=post.getText().toString().trim();if(value.isEmpty()||value.length()>2000){message("Write 1–2,000 characters.");return;}String uid=auth.getUid();send.setEnabled(false);
   db.collection("users").document(uid).get().addOnSuccessListener(user->db.collection("communityPosts").add(Map.of("text",value,"authorId",uid,"authorName",Objects.requireNonNullElse(user.getString("displayName"),"Player"),"createdAt",FieldValue.serverTimestamp())).addOnCompleteListener(t->{send.setEnabled(true);if(t.isSuccessful())post.setText("");else error(t.getException());})).addOnFailureListener(e->{send.setEnabled(true);error(e);});
  });feed=column();body.addView(feed);renderPosts();
 }
 void renderPosts(){if(feed==null||!screen.equals("community"))return;feed.removeAllViews();if(postData==null){text(feed,"Loading posts…",16);return;}if(postData.isEmpty())text(feed,"Be the first to share a matchday moment.",16);
  for(DocumentSnapshot d:postData){LinearLayout c=card(feed);avatar(c,d.getString("authorId"));text(c,d.getString("authorName"),16);text(c,d.getString("text"),17);if(auth.getUid().equals(d.getString("authorId")))button(c,"Delete post",()->new AlertDialog.Builder(this).setMessage("Delete this post?").setNegativeButton("Cancel",null).setPositiveButton("Delete",(a,b)->d.getReference().delete().addOnFailureListener(this::error)).show());}
 }
 void createMatch(){
  page("Make it matchday.",true);text(body,"Pick registered players for both sides. Unequal teams are welcome.",16);
  homeName=input(body,"Home team",draft[0],InputType.TYPE_CLASS_TEXT);awayName=input(body,"Away team",draft[1],InputType.TYPE_CLASS_TEXT);
  venue=input(body,"Venue",draft[2],InputType.TYPE_CLASS_TEXT);date=input(body,"Kickoff (YYYY-MM-DD HH:mm)",draft[3],InputType.TYPE_CLASS_DATETIME);
  selection=column();body.addView(selection);renderSelection();
  EditText search=input(body,"Find players (name starts with)","",InputType.TYPE_CLASS_TEXT);
  button(body,"Search players",()->{searchPrefix=search.getText().toString().trim();players.clear();playerCursor=null;loadPlayers();});
  playerList=column();body.addView(playerList);button(body,"Load more players",this::loadPlayers);
  button(body,"Create match",this::saveMatch);players.clear();playerCursor=null;searchPrefix="";loadPlayers();
 }
 void loadPlayers(){
  int token=generation;Query q=db.collection("registeredPlayers").orderBy("displayName");
  if(!searchPrefix.isEmpty())q=q.startAt(searchPrefix).endAt(searchPrefix+"\uf8ff");
  if(playerCursor!=null)q=q.startAfter(playerCursor);
  q.limit(50).get().addOnSuccessListener(v->{if(token!=generation)return;players.addAll(v.getDocuments());if(!v.isEmpty())playerCursor=v.getDocuments().get(v.size()-1);else message("No more players.");renderPlayers();}).addOnFailureListener(this::error);
 }
 void renderPlayers(){playerList.removeAllViews();for(DocumentSnapshot d:players){
  if(home.containsKey(d.getId())||away.containsKey(d.getId()))continue;
  LinearLayout c=card(playerList);text(c,d.getString("displayName"),17);text(c,"ID: "+d.getId().substring(0,Math.min(8,d.getId().length())),11);
  button(c,"+ Home",()->addPlayer(d,home));button(c,"+ Away",()->addPlayer(d,away));
 }}
 void addPlayer(DocumentSnapshot d,LinkedHashMap<String,Map<String,Object>> side){if(saving)return;Map<String,Object> p=new HashMap<>();p.put("uid",d.getId());p.put("name",d.getString("displayName"));p.put("x",side.isEmpty()?50.0:20.0+(side.size()%3)*30);p.put("y",side.isEmpty()?88.0:20.0+(side.size()%4)*17);p.put("position",side.isEmpty()?"GK":"CMF");side.put(d.getId(),p);renderSelection();renderPlayers();}
 void renderSelection(){selection.removeAllViews();text(selection,home.size()+" vs "+away.size(),26);for(var squad:List.of(home,away)){
  text(selection,squad==home?"Home lineup":"Away lineup",22);
  if(!squad.isEmpty()){Pitch pitch=new Pitch(this,new ArrayList<>(squad.values()),true);selection.addView(pitch,new LinearLayout.LayoutParams(-1,dp(330)));}
  for(var p:squad.values()){LinearLayout c=card(selection);text(c,String.valueOf(p.get("name")),16);String[] roles={"GK","LB","CB","RB","LWB","RWB","DMF","CMF","LMF","RMF","AMF","LWF","RWF","SS","CF"};Spinner role=new Spinner(this);role.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,roles));role.setSelection(Arrays.asList(roles).indexOf(p.get("position")));c.addView(role);role.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener(){public void onNothingSelected(android.widget.AdapterView<?> a){}public void onItemSelected(android.widget.AdapterView<?> a,View v,int n,long id){p.put("position",roles[n]);}});button(c,"Remove",()->{if(!saving){squad.remove(p.get("uid"));renderSelection();renderPlayers();}});}
 }text(selection,"Position guide: GK goalkeeper · LB/CB/RB defenders · LWB/RWB wing-backs · DMF/CMF/AMF midfield · LMF/RMF wide midfield · LWF/RWF wings · SS support striker · CF striker. Attack towards the top; drag markers to place players.",13);}
 void saveMatch(){
  if(saving)return;if(home.isEmpty()||away.isEmpty()){message("Choose at least one registered player on each side.");return;}
  String h=homeName.getText().toString().trim(),a=awayName.getText().toString().trim();if(h.isEmpty()||a.isEmpty()||h.length()>100||a.length()>100){message("Enter team names under 100 characters.");return;}
  String kickoff=date.getText().toString().trim();try{java.time.LocalDateTime.parse(kickoff,java.time.format.DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm").withResolverStyle(java.time.format.ResolverStyle.STRICT));}catch(Exception e){message("Enter kickoff as YYYY-MM-DD HH:mm.");return;}

  saving=true;message("Saving match…");String uid=auth.getUid();DocumentReference ref=db.collection("matches").document();java.util.List<com.google.android.gms.tasks.Task<Void>> writes=new ArrayList<>();
  for(var squad:List.of(home,away))for(var p:squad.values()){Map<String,Object> item=new HashMap<>(p);item.put("side",squad==home?"home":"away");writes.add(db.collection("users").document(uid).collection("matchRosters").document(ref.getId()).collection("players").document((String)p.get("uid")).set(item));}
  Map<String,Object> m=new HashMap<>();m.put("organizerId",uid);m.put("schemaVersion",3);m.put("rosterId",ref.getId());m.put("homeCaptainUid",home.keySet().iterator().next());m.put("awayCaptainUid",away.keySet().iterator().next());m.put("revision",0);m.put("home",h);m.put("away",a);m.put("homeScore",0);m.put("awayScore",0);m.put("minute",1);m.put("events",List.of());m.put("format",home.size()+" vs "+away.size());m.put("venue",venue.getText().toString().trim());m.put("date",kickoff.replace(' ','T'));m.put("competition","Friendly");m.put("type","Friendly");m.put("createdAt",FieldValue.serverTimestamp());m.put("updatedAt",FieldValue.serverTimestamp());
  // Roster must exist before the match, as required by the shared website rules.
  com.google.android.gms.tasks.Tasks.whenAll(writes).addOnSuccessListener(x->ref.set(m).addOnCompleteListener(t->{saving=false;if(t.isSuccessful()){home.clear();away.clear();detail(ref.getId());}else{cleanupRoster(uid,ref.getId());error(t.getException());}})).addOnFailureListener(e->{saving=false;cleanupRoster(uid,ref.getId());error(e);});
 }
 void cleanupRoster(String uid,String id){db.collection("users").document(uid).collection("matchRosters").document(id).collection("players").get().addOnSuccessListener(rows->{for(var row:rows)row.getReference().delete();});}
 void detail(String id){
  screen="detail";currentMatch=id;page("Match centre.",true);int token=generation;LinearLayout content=column();body.addView(content);
  detailWatch=db.collection("matches").document(id).addSnapshotListener((d,e)->{
   if(token!=generation)return;if(e!=null){error(e);return;}if(d==null||!d.exists()){text(content,"Match no longer available.",18);return;}
   content.removeAllViews();text(content,d.getString("home")+"  "+Alerts.number(d,"homeScore")+" – "+Alerts.number(d,"awayScore")+"  "+d.getString("away"),26);
   text(content,Objects.requireNonNullElse(d.getString("venue"),"")+" · "+Objects.requireNonNullElse(d.getString("date"),""),14);
   LinearLayout rosters=column();content.addView(rosters);
   if(Alerts.number(d,"schemaVersion")==3)db.collection("users").document(auth.getUid()).collection("matchRosters").document(id).collection("players").get().addOnSuccessListener(result->{if(token!=generation)return;
    List<Map<String,Object>> members=new ArrayList<>();for(DocumentSnapshot p:result)members.add(p.getData());
    for(String side:List.of("home","away")){List<Map<String,Object>> group=new ArrayList<>();for(var p:members)if(side.equals(p.get("side")))group.add(p);text(rosters,side.equals("home")?d.getString("home"):d.getString("away"),21);rosters.addView(new Pitch(this,group,false),new LinearLayout.LayoutParams(-1,dp(310)));for(var p:group){avatar(rosters,String.valueOf(p.get("uid")));text(rosters,p.get("name")+" · "+p.getOrDefault("position","CMF"),14);}}
    button(rosters,"Record event",()->recordDialog(d,members));button(rosters,"Undo last event",()->undo(d));
   }).addOnFailureListener(this::error);
   else text(content,"Legacy match: use the website to edit this match.",14);
   List<Map<String,Object>> events=(List<Map<String,Object>>)d.get("events");if(events!=null){Map<String,Integer> goals=new LinkedHashMap<>();Map<String,String> goalNames=new HashMap<>();for(var ev:events){if("goal".equals(ev.get("type"))){String key=ev.getOrDefault("playerId",ev.get("player"))+":"+ev.get("side");goals.merge(key,1,Integer::sum);goalNames.put(key,ev.get("player")+" ("+ev.get("side")+")");}}text(content,"Scorers",20);for(var entry:goals.entrySet())text(content,goalNames.get(entry.getKey())+" · "+entry.getValue()+" goals",15);text(content,"Commentary",20);for(int i=events.size()-1;i>=0;i--){var ev=events.get(i);text(content,ev.get("minute")+"'  "+ev.get("player")+" · "+ev.get("type"),16);}}
  });
 }
 void recordDialog(DocumentSnapshot d,List<Map<String,Object>> members){
  LinearLayout form=column();form.setPadding(dp(20),0,dp(20),0);List<String> labels=new ArrayList<>();for(var p:members)labels.add(p.get("name")+" ("+p.get("side")+")");
  Spinner player=new Spinner(this);player.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,labels));form.addView(player);
  String[] types={"goal","assist","yellow","red","substitution"},icons={"⚽","A","🟨","🟥","↔"};Spinner type=new Spinner(this);type.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,types));form.addView(type);
  EditText minute=input(form,"Minute",String.valueOf(Alerts.number(d,"minute")),InputType.TYPE_CLASS_NUMBER);
  AlertDialog dialog=new AlertDialog.Builder(this).setTitle("Record match event").setView(form).setNegativeButton("Cancel",null).setPositiveButton("Save",null).create();dialog.setOnShowListener(x->dialog.getButton(-1).setOnClickListener(v->{
   try{var p=members.get(player.getSelectedItemPosition());Map<String,Object> event=new HashMap<>();event.put("id",UUID.randomUUID().toString());event.put("playerId",p.get("uid"));event.put("player",p.get("name"));event.put("side",p.get("side"));event.put("minute",Integer.parseInt(minute.getText().toString()));event.put("type",types[type.getSelectedItemPosition()]);event.put("icon",icons[type.getSelectedItemPosition()]);event.put("note",types[type.getSelectedItemPosition()]);
    var update=MatchLogic.eventUpdate(d.getData(),event);dialog.getButton(-1).setEnabled(false);persist(d,update,()->dialog.dismiss(),()->dialog.getButton(-1).setEnabled(true));
   }catch(Exception e){error(e);}
  }));dialog.show();
 }
 void persist(DocumentSnapshot expected,Map<String,Object> update,Runnable ok,Runnable fail){
  db.runTransaction(t->{DocumentSnapshot now=t.get(expected.getReference());if(!now.exists()||Alerts.number(now,"revision")!=Alerts.number(expected,"revision"))throw new IllegalStateException("Match changed. Reopen the event and try again.");update.put("updatedAt",FieldValue.serverTimestamp());t.update(expected.getReference(),update);return null;}).addOnSuccessListener(x->ok.run()).addOnFailureListener(e->{error(e);fail.run();});
 }
 void undo(DocumentSnapshot d){List<Map<String,Object>> events=new ArrayList<>((List<Map<String,Object>>)d.get("events"));if(events.isEmpty()){message("No events to undo.");return;}var last=events.remove(events.size()-1);Map<String,Object> update=new HashMap<>();update.put("events",events);long h=Alerts.number(d,"homeScore"),a=Alerts.number(d,"awayScore");if("goal".equals(last.get("type"))){if("home".equals(last.get("side")))h=Math.max(0,h-1);else a=Math.max(0,a-1);}update.put("homeScore",h);update.put("awayScore",a);update.put("minute",Alerts.number(d,"minute"));update.put("revision",Alerts.number(d,"revision")+1);update.put("schemaVersion",Alerts.number(d,"schemaVersion"));persist(d,update,()->message("Last event undone."),()->{});}
 void avatar(LinearLayout parent,String uid){if(uid==null)return;ImageView image=new ImageView(this);image.setImageResource(R.drawable.footly_logo);image.setContentDescription("Profile photo");parent.addView(image,new LinearLayout.LayoutParams(dp(56),dp(56)));db.collection("profilePhotos").document(uid).get().addOnSuccessListener(d->{Blob b=d.getBlob("image");if(b!=null){byte[] bytes=b.toBytes();BitmapFactory.Options o=new BitmapFactory.Options();o.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(bytes,0,bytes.length,o);int sample=1;while(o.outWidth/sample>256||o.outHeight/sample>256)sample*=2;o.inJustDecodeBounds=false;o.inSampleSize=sample;image.setImageBitmap(BitmapFactory.decodeByteArray(bytes,0,bytes.length,o));}});}
 void profile(){
  page("Your profile.",true);String uid=auth.getUid();avatar(body,uid);text(body,Objects.requireNonNullElse(auth.getCurrentUser().getEmail(),""),17);
  int token=generation;db.collection("users").document(uid).get().addOnSuccessListener(d->{if(token==generation)text(body,Objects.requireNonNullElse(d.getString("displayName"),"Player"),20);});
  button(body,"Add profile photo",()->{Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("image/*").addCategory(Intent.CATEGORY_OPENABLE);pick.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"image/jpeg","image/png","image/webp"});startActivityForResult(pick,42);});
  text(body,"JPG, PNG or WebP, under 20 KB. A saved photo cannot be replaced for 365 days.",13);
  text(body,"Notifications",24);text(body,"Match updates and community activity. Background checks run about every 30 minutes and may be delayed by Android. This is not instant push messaging.",14);
  Switch toggle=new Switch(this);toggle.setText("Match & community notifications");toggle.setChecked(Alerts.enabled(this,uid)&&Alerts.allowed(this));body.addView(toggle);
  toggle.setOnCheckedChangeListener((b,on)->{if(on&&Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED){requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},7);}else Alerts.enable(this,on);});
  button(body,"Android notification settings",()->startActivity(new Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(android.provider.Settings.EXTRA_APP_PACKAGE,getPackageName())));
  button(body,"Log out",this::logout);
 }
 @Override public void onRequestPermissionsResult(int r,String[] p,int[] result){super.onRequestPermissionsResult(r,p,result);if(r==7){Alerts.enable(this,result.length>0&&result[0]==PackageManager.PERMISSION_GRANTED);if(auth.getCurrentUser()!=null)profile();}}
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request!=42||result!=RESULT_OK||data==null||auth.getUid()==null)return;
  String uid=auth.getUid();try(InputStream in=getContentResolver().openInputStream(data.getData());ByteArrayOutputStream out=new ByteArrayOutputStream()){
   byte[] buffer=new byte[4096];int count;while((count=in.read(buffer))!=-1){out.write(buffer,0,count);if(out.size()>=20000)throw new IOException("Choose an image smaller than 20 KB.");}
   byte[] bytes=out.toByteArray();BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(bytes,0,bytes.length,bounds);
   if(bounds.outWidth<1||bounds.outHeight<1||bounds.outWidth>2048||bounds.outHeight>2048||!List.of("image/png","image/jpeg","image/webp").contains(bounds.outMimeType))throw new IOException("Choose a valid PNG, JPG or WebP up to 2048 pixels.");
   new AlertDialog.Builder(this).setMessage("Save this photo? It will be locked for 365 days.").setNegativeButton("Cancel",null).setPositiveButton("Save",(a,b)->db.collection("profilePhotos").document(uid).set(Map.of("image",Blob.fromBytes(bytes),"mime",bounds.outMimeType,"changedAt",FieldValue.serverTimestamp())).addOnSuccessListener(v->{message("Photo saved.");profile();}).addOnFailureListener(e->message("Could not save. Existing photos are locked for 365 days; check your connection and try again."))).show();
  }catch(Exception e){error(e);}
 }
}
