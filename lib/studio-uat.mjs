export const STUDENT_UAT=Object.freeze({
 id:'student-hobby-uat-202611',name:'Student / Hobby UAT',
 startsAt:'2026-11-01T00:00:00+08:00',endsAt:'2026-12-01T00:00:00+08:00',
 timeZone:'Asia/Manila',pricePhp:0,automaticRenewal:false,
 limits:Object.freeze({ai:30,compile:50,cloudProjects:10})
});
export function getStudentUat(now=new Date()){
 const time=new Date(now).getTime(),start=Date.parse(STUDENT_UAT.startsAt),end=Date.parse(STUDENT_UAT.endsAt);
 const active=Number.isFinite(time)&&time>=start&&time<end;
 const status=active?'open':time<start?'upcoming':'closed';
 return {...STUDENT_UAT,active,status,
  dateLabel:'November 1–30, 2026 (Asia/Manila)',
  message:active?'Free Student / Hobby UAT is open through November 30, 2026, Manila time. Verify your email to use 30 AI drafts, 50 cloud builds and 10 private saved projects. No payment or automatic renewal.':
   status==='upcoming'?'Student / Hobby UAT opens November 1, 2026, Manila time. Free public Studio tools remain available.':
   'The Student / Hobby UAT period has ended. New AI drafts, cloud builds and cloud project saves are closed. Existing saved projects remain readable; free public Studio tools remain available.'};
}
export function requireStudentUat(now=new Date()){
 const uat=getStudentUat(now);
 if(!uat.active){const error=new Error(uat.message);error.code='STUDIO_UAT_CLOSED';throw error;}
 return uat;
}
export function studentUatRejection(now=new Date()){
 const uat=getStudentUat(now);
 return uat.active?null:Response.json({error:uat.message,code:'STUDIO_UAT_CLOSED'},{status:403,headers:{'Cache-Control':'no-store'}});
}
export function studentUsagePeriod(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:STUDENT_UAT.timeZone,year:'numeric',month:'2-digit'}).formatToParts(new Date(now));
 return parts.find(part=>part.type==='year').value+'-'+parts.find(part=>part.type==='month').value;
}
