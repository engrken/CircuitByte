'use strict';
const code=document.querySelector('#tracking-code'),result=document.querySelector('#tracking-result'),error=document.querySelector('#tracking-error'),button=document.querySelector('#check');
const text=(tag,value)=>{const e=document.createElement(tag);e.textContent=value;return e;};
try{code.value=location.hash.slice(1)||localStorage.getItem('circuitbyte.lastTracking')||'';}catch{code.value=location.hash.slice(1);}
history.replaceState(null,'',location.pathname);
async function check(e){e?.preventDefault();const token=code.value.trim().split('#').pop();button.disabled=true;error.textContent='';result.hidden=true;try{const r=await fetch('/api/orders/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});const o=await r.json();if(!r.ok){if(r.status===404){try{const pending=JSON.parse(sessionStorage.getItem('circuitbyte.checkoutAttempt')||'null');if(pending?.token===token)sessionStorage.removeItem('circuitbyte.checkoutAttempt');}catch{}}throw Error(o.error);}try{localStorage.setItem('circuitbyte.lastTracking',token);const pending=JSON.parse(sessionStorage.getItem('circuitbyte.checkoutAttempt')||'null');if(pending?.token===token){sessionStorage.removeItem('circuitbyte.checkoutAttempt');localStorage.removeItem('circuitbyte.cart.v2');}}catch{}
 result.replaceChildren(text('h2',o.reference),text('h3',o.status),
  text('p','Updated: '+new Date(o.updated_at).toLocaleString('en-PH',{timeZone:'Asia/Manila'})+' PHT'));
 const details=text('a','Sign in to My Orders for order and delivery details');
 details.href='/dashboard';result.append(details);
 const copy=text('button','Copy private tracking link');copy.onclick=async()=>{try{await navigator.clipboard.writeText(location.origin+'/track.html#'+token);copy.textContent='Copied';}catch{code.value=location.origin+'/track.html#'+token;code.select();error.textContent='Copy the selected link manually.';}};result.append(copy);result.hidden=false;
 }catch(e){error.textContent=e.message;}finally{button.disabled=false;}}
document.querySelector('#tracking-form').onsubmit=check;document.querySelector('#forget').onclick=()=>{try{localStorage.removeItem('circuitbyte.lastTracking');}catch{}code.value='';result.hidden=true;error.textContent='Saved code removed from this browser.';};if(code.value)check();
