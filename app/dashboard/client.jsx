'use client';
import {useEffect,useState} from 'react';
import {createAuthClient} from 'better-auth/react';
import {emailOTPClient} from 'better-auth/client/plugins';
import {studioBoardName} from '../../lib/studio-boards.mjs';
import {StudioKnowledgeReview} from './knowledge-review';
import OrderList from './order-list';
const auth=createAuthClient({plugins:[emailOTPClient()]});
const empty={schoolName:'',program:'',role:'student',publicConsent:false};
const normalize=p=>p?{schoolName:p.school_name||'',program:p.program||'',role:p.role_name||'student',publicConsent:Boolean(p.public_consent)}:empty;
export default function StudioAccount(){
 const {data:session,isPending}=auth.useSession();
 const [mode,setMode]=useState('login'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [email,setEmail]=useState(''),[checkout,setCheckout]=useState(false),[qrCheckout,setQrCheckout]=useState(false),[resetToken,setResetToken]=useState('');
 const [uat,setUat]=useState(null);
 const [registrationOpen,setRegistrationOpen]=useState(false),[registrationNotice,setRegistrationNotice]=useState('');
 const [profile,setProfile]=useState(empty),[original,setOriginal]=useState(null),[projects,setProjects]=useState([]),[orders,setOrders]=useState([]);
 const [adminQueue,setAdminQueue]=useState(null),[isAdmin,setIsAdmin]=useState(false);
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);
  setCheckout(params.get('checkout')==='1');setQrCheckout(params.get('payment')==='qrph');
  if(params.get('token')){setResetToken(params.get('token'));setMode('reset');window.history.replaceState(null,'',params.get('checkout')==='1'?'/dashboard?checkout=1'+(params.get('payment')==='qrph'?'&payment=qrph':''):'/dashboard');}
  else if(params.get('error'))setError('That password link has expired. Request a new one.');
  else if(params.get('register')==='1')setMode('signup');
  fetch('/api/studio/access',{cache:'no-store'}).then(r=>r.json()).then(d=>{
   setUat(d.uat||null);setRegistrationOpen(Boolean(d.registrationOpen));setRegistrationNotice(d.notice||'');
  }).catch(()=>{});
 },[]);
 async function load(){
  const [p,q,m]=await Promise.all([fetch('/api/studio/profile',{cache:'no-store'}),fetch('/api/studio/projects',{cache:'no-store'}),fetch('/api/orders/my',{cache:'no-store'})]);
  if(!p.ok||!q.ok||!m.ok)throw Error('Could not load your CircuitByte account. Please try again.');
  const result=await p.json(), saved=await q.json(),myOrders=await m.json();
  setOriginal(result.profile);setProfile(normalize(result.profile));setProjects(saved.projects||[]);setOrders(myOrders.orders||[]);setIsAdmin(Boolean(result.isAdmin));
 }
 useEffect(()=>{if(!session?.user?.emailVerified)return;if(checkout&&mode!=='reset'){window.location.assign('/catalog?cart=1'+(qrCheckout?'&payment=qrph':''));return;}load().catch(e=>setError(e.message));},[session?.user?.id,session?.user?.emailVerified,checkout,qrCheckout,mode]);
 function changeMode(next){setMode(next);setError('');setNotice('');}
 async function resend(){
  setBusy(true);setError('');setNotice('');
  try{
   const result=await auth.emailOtp.sendVerificationOtp({email:email.trim().toLowerCase(),type:'email-verification'});
   if(result.error)throw Error(result.error.message);
   setNotice('If your account is awaiting verification, a new code has been sent.');
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function login(e){
  e.preventDefault();setBusy(true);setError('');setNotice('');
  const data=new FormData(e.currentTarget),address=email.trim().toLowerCase();
  try{
   if(mode==='verify'){
    const result=await auth.emailOtp.verifyEmail({email:address,otp:String(data.get('otp')).trim()});
    if(result.error)throw Error(result.error.message);
    setMode('login');setNotice('Email verified. Sign in with your password.');
   }else if(mode==='signup'){
    if(!registrationOpen)throw Error('New accounts are temporarily unavailable.');
    const result=await auth.signUp.email({name:String(data.get('name')),email:address,password:String(data.get('password'))});
    if(result.error)throw Error(result.error.message);
    setEmail(address);setMode('verify');
    setNotice('Enter the 6-digit registration code sent to your email. The code expires in 5 minutes.');
   }else if(mode==='forgot'){
    const result=await auth.requestPasswordReset({email:address,redirectTo:window.location.origin+'/dashboard'+(checkout?'?checkout=1'+(qrCheckout?'&payment=qrph':''):'')});
    if(result.error)throw Error(result.error.message);
    setNotice('If this is a verified account, check your inbox for a password link.');
   }else if(mode==='reset'){
    const result=await auth.resetPassword({token:resetToken,newPassword:String(data.get('password'))});
    if(result.error)throw Error(result.error.message);
    window.history.replaceState(null,'',checkout?'/dashboard?checkout=1'+(qrCheckout?'&payment=qrph':''):'/dashboard');
    setMode('login');setNotice('Password saved. You can now sign in.');
   }else{
    const result=await auth.signIn.email({email:address,password:String(data.get('password'))});
    if(result.error){
     if(result.error.code==='EMAIL_NOT_VERIFIED'){setEmail(address);setMode('verify');}
     throw Error(result.error.message);
    }
    if(checkout){window.location.assign('/catalog?cart=1'+(qrCheckout?'&payment=qrph':''));return;}
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
  catch(e){setAdminQueue(null);setError('Unable to load the school review queue: '+e.message);}
 }
 async function review(userId,approve){
  setBusy(true);setError('');
  try{const r=await fetch('/api/admin/schools',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,approve})});const j=await r.json();if(!r.ok)throw Error(j.error);await loadReviews();setNotice(approve?'Affiliation marked reviewed and approved.':'Public school listing approval revoked.');}
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 if(isPending)return <p className="account-message">Checking your session…</p>;
 return <div className="account-page">
  <header className="account-hero"><span className="edu-kicker">CIRCUITBYTE / MEMBER WORKSPACE</span><h1>My CircuitByte Dashboard</h1><p>Track your orders, manage your account, and open your saved Studio projects.</p></header>
  {uat&&<section className="account-card account-uat" aria-label="Student Hobby UAT access"><h2>{uat.active?'Student / Hobby UAT — Free':'Student / Hobby UAT closed'}</h2><p>{uat.message}</p><a href="/studio/pricing">View UAT dates and allowances →</a></section>}
  {error&&<p className="account-error" role="alert">{error}</p>}
  {notice&&<p className="account-notice" role="status">{notice}</p>}
  {session?.user && !session.user.emailVerified ? <section className="account-card account-login">
    <h2>Verify your email</h2><p>Enter your registration code to activate your CircuitByte account.</p>
    <button type="button" onClick={async()=>{await auth.signOut();setEmail(session.user.email);changeMode('verify');}}>Verify email</button>
  </section> :
  !session?.user||mode==='reset'?<section className="account-card account-login">
    <h2>{{login:'Sign in',signup:'Create an account',verify:'Verify your email',forgot:'Get a password link',reset:'Set your password'}[mode]}</h2>
    {mode==='login'&&<p>{checkout?'Sign in to return to your cart.':registrationNotice}</p>}
    <form key={mode} onSubmit={login}>
     {mode==='signup'&&<label>Full name<input name="name" required maxLength={100} autoComplete="name"/></label>}
     {mode!=='reset'&&<label>Email address<input name="email" type="email" required maxLength={200} value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>}
     {mode==='verify'&&<label>6-digit code<input name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required maxLength={6}/></label>}
     {['login','signup','reset'].includes(mode)&&<label>Password<input name="password" type="password" required minLength={mode==='login'?undefined:12} maxLength={128} autoComplete={mode==='login'?'current-password':'new-password'}/></label>}
     <button type="submit" disabled={busy||(mode==='signup'&&!registrationOpen)}>{busy?'Working…':{login:'Sign in',signup:'Register',verify:'Verify email',forgot:'Send password link',reset:'Save password'}[mode]}</button>
    </form>
    {mode==='verify'&&<button className="account-link" type="button" disabled={busy} onClick={resend}>Send a new code</button>}
    {mode==='login'&&<button className="account-link" type="button" onClick={()=>changeMode('forgot')}>Forgot your password or used email-code sign-in before?</button>}
    {mode==='login'&&registrationOpen&&<><button className="account-link" type="button" onClick={()=>changeMode('signup')}>Create an account</button> <button className="account-link" type="button" onClick={()=>changeMode('verify')}>Enter a registration code</button></>}
    {mode!=='login'&&<button className="account-link" type="button" onClick={()=>changeMode('login')}>Back to sign in</button>}
  </section>:
  <div className="account-layout">
   <OrderList orders={orders} onUpdate={load}/>
   <section className="account-card"><div className="account-top"><div><h2>My profile</h2><p>Signed in as <strong>{session.user.name}</strong> ({session.user.email})</p></div><button type="button" onClick={()=>auth.signOut()}>Sign out</button></div>
    <form onSubmit={saveProfile} className="account-form">
     <label>School / institution (optional)<input maxLength={120} value={profile.schoolName} onChange={e=>setProfile(p=>({...p,schoolName:e.target.value}))} placeholder="Official institution name"/></label>
     <label>Program or department (optional)<input maxLength={120} value={profile.program} onChange={e=>setProfile(p=>({...p,program:e.target.value}))} placeholder="e.g. Electronics Engineering"/></label>
     <label>I'm using CircuitByte as<select value={profile.role} onChange={e=>setProfile(p=>({...p,role:e.target.value}))}>{['student','educator','hobbyist','professional','other'].map(x=><option key={x} value={x}>{x.charAt(0).toUpperCase()+x.slice(1)}</option>)}</select></label>
     <label className="account-check"><input type="checkbox" checked={profile.publicConsent} onChange={e=>setProfile(p=>({...p,publicConsent:e.target.checked}))}/><span className="account-check-copy">Allow CircuitByte to list my school's name in the public community section <strong>after independent administrator verification</strong>. My personal name, email and program will not be displayed there.</span></label>
     <p className="account-muted">Providing a school name does not prove enrollment or school endorsement. School names remain private unless verified, consented to and approved.</p>
     {original?.school_public_approved&&original?.school_verified&&original?.public_consent?<p className="account-status">Your verified school is approved for the public list.</p>:<p className="account-muted">Public affiliation: Not listed.</p>}
     <button type="submit" disabled={busy}>Save profile</button>
    </form>
   </section>
   <section className="account-card"><div className="account-top"><div><h2>Saved Arduino projects</h2><p>{projects.length} of 10 project slots used.</p></div><a href="/studio">Open Studio →</a></div>
    {projects.length? <ul className="account-projects">{projects.map(p=><li key={p.id}><div><strong>{p.title}</strong><span>{studioBoardName(p.board)} · {new Date(p.updated_at).toLocaleDateString('en-PH',{timeZone:'Asia/Manila'})} · revision {p.revision||1}{Array.isArray(p.acceptance_record?.criteria)&&p.acceptance_record.criteria.length?' · Private, user-reported hardware test record saved':''}</span></div><div><a href={'/studio?project='+encodeURIComponent(p.id)}>Open in Studio</a><button type="button" disabled={busy} onClick={()=>deleteProject(p.id)}>Delete</button></div></li>)}</ul>:<p className="account-muted">No cloud projects yet. Generate a project in Studio and choose “Save to dashboard.”</p>}
   </section>
   {!isAdmin?null:<section className="account-card account-admin-review"><h2>School verification (admin only)</h2><p>Administrators must verify actual affiliation and consent before approving public listing. Do not rely on self-declared school names alone.</p>
    <button onClick={loadReviews} type="button">Load review queue</button>
    {adminQueue&&<ul className="account-projects">{adminQueue.map(p=><li key={p.user_id}><div><strong>{p.school_name}</strong><span>{p.name} · {p.email} · {p.public_consent?'Opted in':'Private'} · {p.school_public_approved?'Approved':'Unapproved'}</span></div><div><button type="button" disabled={busy||!p.public_consent} onClick={()=>review(p.user_id,true)}>Verified &amp; approve</button><button type="button" disabled={busy||(!p.school_public_approved&&!p.school_verified)} onClick={()=>review(p.user_id,false)}>Revoke</button></div></li>)}</ul>}
   </section>}
   {isAdmin&&<StudioKnowledgeReview/>}
  </div>}
 </div>;
}
