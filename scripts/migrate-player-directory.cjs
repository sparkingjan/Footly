// Uses the signed-in Firebase CLI. Credentials and account exports are never printed or saved.
const path=require('node:path');
const cliRoot=process.argv[2];if(!cliRoot)throw new Error('Pass the installed firebase-tools directory.');
const {getGlobalDefaultAccount}=require(path.join(cliRoot,'lib/auth.js'));
const {requireAuth}=require(path.join(cliRoot,'lib/requireAuth.js'));
const {Client}=require(path.join(cliRoot,'lib/apiv2.js'));
async function run(){
 const project='footly-b4c3e',account=getGlobalDefaultAccount();if(!account)throw new Error('Run firebase login first.');
 await requireAuth({project,...account});
 const identity=new Client({urlPrefix:'https://identitytoolkit.googleapis.com'}),store=new Client({urlPrefix:'https://firestore.googleapis.com'});
 const root=`projects/${project}/databases/(default)/documents`;let pageToken,count=0;
 do{
  const response=await identity.get(`/v1/projects/${project}/accounts:batchGet`,{queryParams:{maxResults:100,...(pageToken?{nextPageToken:pageToken}:{})},skipLog:{resBody:true}});
  for(const user of response.body.users||[]){
   if(user.disabled)continue;let name=user.displayName||'Player';
   try{const profile=await store.get(`/v1/${root}/users/${user.localId}`,{skipLog:{resBody:true}});name=profile.body.fields?.displayName?.stringValue||name;}catch(error){if(error.status!==404&&error.context?.response?.statusCode!==404)throw new Error('Could not read an existing account profile.');}
   await store.patch(`/v1/${root}/registeredPlayers/${user.localId}`,{fields:{displayName:{stringValue:String(name).trim().slice(0,100)||'Player'}}},{skipLog:{reqBody:true,resBody:true}});count++;
  }
  pageToken=response.body.nextPageToken;
 }while(pageToken);
 console.log(`Registered-player directory updated for ${count} active accounts. Only account IDs and display names were published.`);
}
run().catch(error=>{console.error('Directory migration failed; status:',error.status||error.context?.response?.statusCode||'unavailable');process.exitCode=1;});
