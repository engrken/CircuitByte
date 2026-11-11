'use client';
import {useState} from 'react';
import {Management,ManagementPages,manilaDate,useManagement} from '../management';

const notice={sent:'Verification email sent.',failed:'Email delivery failed. You can retry below.',pending:'Verification email is pending. You can retry below.'};

export default function Accounts(){
 const state=useManagement('/api/admin/accounts');
 const [selected,setSelected]=useState(null);
 async function verify(event){
  event.preventDefault();
  const form=new FormData(event.currentTarget);
  const saved=await state.save({action:'verify',id:selected.id,reason:form.get('reason'),confirmed:form.has('confirmed')},
   result=>'Account verified. '+notice[result.delivery]);
  if(saved)setSelected(null);
 }
 return <Management title="Account verification" description="Review pending registrations and verify accounts whose ownership you have confirmed." state={state}>
  <section className="management-section">
   <h2>Pending accounts</h2>
   {!state.data?.pending.length&&<p>No pending accounts on this page.</p>}
   {state.data?.pending.map(account=><div className="management-row" key={account.id}>
    <div><strong>{account.name}</strong><p>{account.email}</p><small>Registered {manilaDate(account.createdAt)}</small></div>
    <button type="button" disabled={state.busy} onClick={()=>setSelected(account)} aria-label={`Verify ${account.email}`}>Verify account</button>
   </div>)}
   <ManagementPages state={state}/>
   {selected&&<form key={selected.id} onSubmit={verify}>
    <h3>Verify {selected.email}</h3>
    <label>Reason for manual verification<textarea name="reason" required minLength={5} maxLength={300} rows={2}/></label>
    <label className="management-check"><input type="checkbox" name="confirmed" required/> I confirmed that this person controls this CircuitByte account and email address.</label>
    <div className="management-actions"><button className="primary" disabled={state.busy}>Verify and notify</button><button type="button" disabled={state.busy} onClick={()=>setSelected(null)}>Cancel</button></div>
   </form>}
  </section>
  <section className="management-section">
   <h2>Recent manual verifications</h2>
   {!state.data?.recent.length&&<p>No manual verifications yet.</p>}
   {state.data?.recent.map(record=><div className="management-row" key={record.user_id}>
    <div><strong>{record.email}</strong><p>{manilaDate(record.verified_at)} · {record.verified_by}</p><p>{record.reason}</p><small>{notice[record.delivery]}</small></div>
    {record.delivery!=='sent'&&<button type="button" disabled={state.busy} onClick={()=>state.save({action:'retry',id:record.user_id},result=>notice[result.delivery])}>Retry email</button>}
   </div>)}
  </section>
 </Management>;
}
