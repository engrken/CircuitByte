'use client';
import {useState} from 'react';
import {auth} from '../account-auth-client';
import {minimumPasswordLength,maximumPasswordLength} from '../../lib/account-policy.mjs';

export default function AccountSecurity(){
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const [confirmAll,setConfirmAll]=useState(false);

 async function run(action){
  setBusy(true);setError('');setMessage('');
  try{await action();}
  catch(error){setError(error.message||'The security setting could not be updated.');}
  finally{setBusy(false);}
 }

 async function changePassword(event){
  event.preventDefault();
  const form=event.currentTarget;
  const data=new FormData(form);
  if(data.get('newPassword')!==data.get('confirmPassword')){
   setError('The new passwords do not match.');setMessage('');
   return;
  }
  await run(async()=>{
   const result=await auth.changePassword({
    currentPassword:String(data.get('currentPassword')),newPassword:String(data.get('newPassword')),revokeOtherSessions:true
   });
   if(result.error)throw Error(result.error.message||'Could not change your password.');
   form.reset();
   setMessage('Password changed. Your other devices were signed out.');
  });
 }

 async function signOutDevices(all){
  await run(async()=>{
   const result=all?await auth.revokeSessions():await auth.revokeOtherSessions();
   if(result.error)throw Error(result.error.message||'Could not sign out your devices.');
   if(all){window.location.replace('/dashboard?signedOut=all');return;}
   setMessage('Your other devices were signed out.');
  });
 }

 return <section className="account-card account-security" aria-labelledby="account-security-title">
  <h2 id="account-security-title">Account security</h2>
  {error&&<p className="account-error" role="alert">{error}</p>}
  {message&&<p className="account-notice" role="status">{message}</p>}
  <details>
   <summary>Change password</summary>
   <form className="account-form" onSubmit={changePassword}>
    <label>Current password<input name="currentPassword" type="password" autoComplete="current-password" maxLength={maximumPasswordLength} required/></label>
    <label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength={minimumPasswordLength} maxLength={maximumPasswordLength} required/></label>
    <label>Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={minimumPasswordLength} maxLength={maximumPasswordLength} required/></label>
    <p>Use at least {minimumPasswordLength} characters. Changing your password signs out other devices.</p>
    <button disabled={busy}>Save new password</button>
   </form>
  </details>
  <div className="account-security-actions">
   <button type="button" disabled={busy} onClick={()=>signOutDevices(false)}>Sign out other devices</button>
   <button type="button" disabled={busy} onClick={()=>setConfirmAll(true)}>Sign out of all devices</button>
  </div>
  {confirmAll&&<div>
   <p>This ends every CircuitByte session, including this one.</p>
   <div className="account-security-actions">
    <button type="button" disabled={busy} onClick={()=>signOutDevices(true)}>Confirm sign out everywhere</button>
    <button type="button" disabled={busy} onClick={()=>setConfirmAll(false)}>Cancel</button>
   </div>
  </div>}
 </section>;
}
