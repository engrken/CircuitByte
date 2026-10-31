'use strict';
(async()=>{const root=document.getElementById('school-names');if(!root)return;
 try{
  const response=await fetch('/api/studio/schools',{cache:'no-store'});
  if(!response.ok)throw Error('School listing unavailable');
  const data=await response.json();root.replaceChildren();
  const names=Array.isArray(data.schools)?data.schools.filter(x=>typeof x.name==='string'&&x.name.length<=120):[];
  if(!names.length){const p=document.createElement('p');p.className='school-empty';p.textContent='No verified, opted-in school affiliations are published yet. Members can request inclusion from their dashboard.';root.append(p);return;}
  const list=document.createElement('div');list.className='school-pill-list';
  for(const school of names){const item=document.createElement('span');item.className='school-pill';item.textContent=school.name;list.append(item);}
  root.append(list);
 }catch{root.textContent='The verified school directory is temporarily unavailable.';}
})();
