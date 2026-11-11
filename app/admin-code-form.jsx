'use client';
import {useState} from 'react';
import {auth,sendAdminCode} from './account-auth-client';

export default function AdminCodeForm({onVerified,onBack,busy:initialBusy=false}){
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');

 async function verify(event){
  event.preventDefault();
  const code=String(new FormData(event.currentTarget).get('code')).trim();
  setBusy(true);setError('');setNotice('');
  try{
   const result=await auth.twoFactor.verifyOtp({code});
   if(result.error)throw Error(result.error.message||'The code could not be verified.');
   await onVerified();
  }catch(error){setError(error.message);}finally{setBusy(false);}
 }

 async function resend(){
  setBusy(true);setError('');setNotice('');
  try{await sendAdminCode();setNotice('A verification code was sent. Check your administrator email.');}
  catch(error){setError(error.message);}finally{setBusy(false);}
 }

 return <>
  <h2>Verify administrator sign-in</h2>
  <p>Enter the six-digit code sent to your administrator email. The code expires in five minutes.</p>
  {error&&<p role="alert">{error}</p>}
  {notice&&<p role="status">{notice}</p>}
  <form onSubmit={verify}>
   <label>Sign-in code<input name="code" inputMode="numeric" autoComplete="one-time-code"
    pattern="[0-9]{6}" maxLength={6} required autoFocus/></label>
   <button type="submit" disabled={busy||initialBusy}>{busy?'Working…':'Verify and sign in'}</button>
  </form>
  <div className="account-security-actions">
   <button type="button" disabled={busy||initialBusy} onClick={resend}>Send another code</button>
   <button type="button" disabled={busy||initialBusy} onClick={onBack}>Back to sign in</button>
  </div>
 </>;
}
