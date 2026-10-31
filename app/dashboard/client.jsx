'use client';
import {useEffect,useState} from 'react';
import {createAuthClient} from 'better-auth/react';
const auth=createAuthClient();
const empty={schoolName:'',program:'',role:'student',publicConsent:false};
const normalize=p=>p?{schoolName:p.school_name||'',program:p.program||'',role:p.role_name||'student',publicConsent:Boolean(p.public_consent)}:empty;
export default function StudioAccount(){
 const {data:session,isPending}=auth.useSession();
 const [mode,setMode]=useState('login'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [registrationOpen,setRegistrationOpen]=useState(false),[registrationNotice,setRegistrationNotice]=useState('');
 const [profile,setProfile]=useState(empty),[original,setOriginal]=useState(null),[projects,setProjects]=useState([]);
 const [adminQueue,setAdminQueue]=useState(null);
 useEffect(()=>{fetch('/api/studio/access',{cache:'no-store'}).then(r=>r.json()).then(d=>{setRegistrationOpen(Boolean(d.registrationOpen));setRegistrationNotice(d.notice||'');}).catch(()=>{});},[]);
 async function load(){
  const [p,q]=await Promise.all([fetch('/api/studio/profile',{cache:'no-store'}),fetch('/api/studio/projects',{cache:'no-store'})]);
  if(!p.ok||!q.ok)throw Error('Could not load Studio account. Database initialization may still be pending.');
  const result=await p.json(), saved=await q.json();
  setOriginal(result.profile);setProfile(normalize(result.profile));setProjects(saved.projects||[]);
 }
 useEffect(()=>{if(!session?.user)return;load().catch(e=>setError(e.message));},[session?.user?.id]);
 async function login(e){
  e.preventDefault();setBusy(true);setError('');setNotice('');
  const data=new FormData(e.currentTarget);
  try{
   if(mode==='signup'){
    if(!registrationOpen)throw Error('New accounts are not open yet.');
    const result=await auth.signUp.email({name:String(data.get('name')),email:String(data.get('email')),password:String(data.get('password'))});
    if(result.error)throw Error(result.error.message);
    setNotice('Registration received. Check your inbox for a verification link before signing in.');setMode('login');
   }else{
    const result=await auth.signIn.email({email:String(data.get('email')),password:String(data.get('password'))});
    if(result.error)throw Error(result.error.message);
    await load();
   }
  }catch(e){setError(e.message||'Unable to authenticate.');}
  finally{setBusy(false);}
 }
 async function saveProfile(e){
  e.preventDefault();setBusy(true);setError('');setNotice('');
  try{
   const response=await fetch('/api/studio/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(profile)});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to save');
   setOriginal(data.profile);setProfile(normalize(data.profile));
   setNotice('Profile saved. Your school is NOT listed publicly without your consent AND an administrator verifying and approving the affiliation.');
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function deleteProject(id){
  if(!window.confirm('Permanently delete this saved Studio project?'))return;
  setBusy(true);setError('');
  try{
   const r=await fetch('/api/studio/projects',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
   const result=await r.json();if(!r.ok)throw Error(result.error);
   await load();setNotice('Project deleted.');
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function loadReviews(){
  setError('');
  try{const r=await fetch('/api/admin/schools',{cache:'no-store'});const j=await r.json();if(!r.ok)throw Error(j.error);setAdminQueue(j.profiles||[]);}
  catch(e){setError('School review is available only to the site administrator: '+e.message);}
 }
 async function review(userId,approve){
  setBusy(true);setError('');
  try{const r=await fetch('/api/admin/schools',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,approve})});const j=await r.json();if(!r.ok)throw Error(j.error);await loadReviews();setNotice(approve?'Affiliation marked reviewed and approved.':'Public school listing approval revoked.');}
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 if(isPending)return <p className="account-message">Checking your session…</p>;
 return <div className="account-page">
  <header className="account-hero"><span className="edu-kicker">CIRCUITBYTE / MEMBER WORKSPACE</span><h1>My CircuitByte Dashboard</h1><p>Save your Arduino projects, manage your profile and school information, and build at your own pace.</p></header>
  {error&&<p className="account-error" role="alert">{error}</p>}
  {notice&&<p className="account-notice" role="status">{notice}</p>}
  {!session?.user?<section className="account-card account-login">
    <h2>{mode==='login'?'Member sign in':'Create a member account'}</h2><p>{registrationNotice}</p>
    <form onSubmit={login}>
     {mode==='signup'&&<label>Full name<input name="name" required maxLength={100} autoComplete="name"/></label>}
     <label>Email address<input name="email" type="email" required autoComplete="email"/></label>
     <label>Password<input name="password" type="password" required minLength={12} autoComplete={mode==='login'?'current-password':'new-password'}/></label>
     <button type="submit" disabled={busy}>{busy?'Checking…':mode==='login'?'Sign in':'Register and verify email'}</button>
    </form>
    {registrationOpen?<button className="account-link" type="button" onClick={()=>{setMode(mode==='login'?'signup':'login');setError('');}}>{mode==='login'?'New member? Create account':'Already registered? Sign in'}</button>:<p className="account-muted">Self-registration is not enabled until secure verification emails are configured. Existing members can still sign in.</p>}
  </section>:
  <div className="account-layout">
   <section className="account-card"><div className="account-top"><div><h2>My profile</h2><p>Signed in as <strong>{session.user.name}</strong> ({session.user.email})</p></div><button type="button" onClick={()=>auth.signOut()}>Sign out</button></div>
    <form onSubmit={saveProfile} className="account-form">
     <label>School / institution (optional)<input maxLength={120} value={profile.schoolName} onChange={e=>setProfile(p=>({...p,schoolName:e.target.value}))} placeholder="Official institution name"/></label>
     <label>Program or department (optional)<input maxLength={120} value={profile.program} onChange={e=>setProfile(p=>({...p,program:e.target.value}))} placeholder="e.g. Electronics Engineering"/></label>
     <label>I'm using CircuitByte as<select value={profile.role} onChange={e=>setProfile(p=>({...p,role:e.target.value}))}>{['student','educator','hobbyist','professional','other'].map(x=><option key={x} value={x}>{x.charAt(0).toUpperCase()+x.slice(1)}</option>)}</select></label>
     <label className="account-check"><input type="checkbox" checked={profile.publicConsent} onChange={e=>setProfile(p=>({...p,publicConsent:e.target.checked}))}/> Allow CircuitByte to list my school's name in the public community section <strong>after independent administrator verification</strong>. My personal name, email and program will not be displayed there.</label>
     <p className="account-muted">Providing a school name does not prove enrollment or school endorsement. School names remain private unless verified, consented to and approved.</p>
     {original?.school_public_approved&&original?.school_verified&&original?.public_consent?<p className="account-status">Your verified school is approved for the public list.</p>:<p className="account-muted">Public affiliation: Not listed.</p>}
     <button type="submit" disabled={busy}>Save profile</button>
    </form>
   </section>
   <section className="account-card"><div className="account-top"><div><h2>Saved Arduino projects</h2><p>{projects.length} of 10 beta project slots used.</p></div><a href="/studio">Open Studio →</a></div>
    {projects.length? <ul className="account-projects">{projects.map(p=><li key={p.id}><div><strong>{p.title}</strong><span>Arduino UNO · {new Date(p.updated_at).toLocaleDateString('en-PH')}</span></div><div><a href={'/studio?project='+encodeURIComponent(p.id)}>Open in Studio</a><button type="button" disabled={busy} onClick={()=>deleteProject(p.id)}>Delete</button></div></li>)}</ul>:<p className="account-muted">No cloud projects yet. Generate a project in Studio and choose “Save to dashboard.”</p>}
   </section>
   {session.user.email?.toLowerCase()===undefined?null:<section className="account-card account-admin-review"><h2>School verification (admin only)</h2><p>Administrators must verify actual affiliation and consent before approving public listing. Do not rely on self-declared school names alone.</p>
    <button onClick={loadReviews} type="button">Load review queue</button>
    {adminQueue&&<ul className="account-projects">{adminQueue.map(p=><li key={p.user_id}><div><strong>{p.school_name}</strong><span>{p.name} · {p.email} · {p.public_consent?'Opted in':'Private'} · {p.school_public_approved?'Approved':'Unapproved'}</span></div><div><button type="button" disabled={busy||!p.public_consent} onClick={()=>review(p.user_id,true)}>Verified &amp; approve</button><button type="button" disabled={busy||!p.public_consent} onClick={()=>review(p.user_id,false)}>Revoke</button></div></li>)}</ul>}
   </section>}
  </div>}
 </div>;
}
