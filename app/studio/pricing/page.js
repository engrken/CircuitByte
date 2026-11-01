import {EducationShell} from '../../education/shell';
import {getStudentUat} from '../../../lib/studio-uat.mjs';
import pricing from '../../../content/studio-pricing.json';
import './pricing.css';

export const metadata={
  title:'Student / Hobby UAT and Studio Plans | CircuitByte',
  description:'Student / Hobby UAT dates, free testing allowances and future CircuitByte Studio plans. No recurring billing.'
};

const pesos=value=>value===0?'Free':'₱'+value.toLocaleString('en-PH');

export const dynamic='force-dynamic';
export default function StudioPricing(){
  const uat=getStudentUat();
  return <EducationShell active="studio">
    <section className="studio-price-hero">
      <div className="studio-price-heading">
        <span className="edu-kicker">CIRCUITBYTE / STUDENT &amp; HOBBY UAT</span>
        <h1>Build. Test. <em>Tell us what works.</em></h1>
        <p>{uat.message} Pro Maker and Classroom plans remain proposals and are not for sale.</p>
        <a href="/studio" className="edu-button">Explore the free Studio →</a>
      </div>
      <div className="studio-price-banner" role="note"><strong>{uat.active?'Free Student / Hobby UAT · November 1–30, 2026':'Student / Hobby UAT is closed'}</strong><p>30 AI drafts · 50 cloud builds · 10 private saved projects per verified account. Ends December 1 at 12:00 AM Manila time. No card, charge or automatic renewal.</p></div>
    </section>
    <section className="studio-price-main" aria-label="Student UAT and proposed membership plans">
      <div className="studio-price-grid">{pricing.plans.map(plan=>
        <article key={plan.id} className={'studio-price-card '+(plan.id==='starter'?'studio-price-featured':'')}>
          <div className="studio-price-category">{plan.id==='starter'?(uat.active?'FREE UAT / OPEN NOW':'UAT CLOSED'):plan.id==='free'?'ALWAYS AVAILABLE':'FUTURE / NOT FOR SALE'}</div>
          <h2>{plan.name}</h2><p className="studio-price-audience">{plan.audience}</p>
          <div className="studio-price-amount"><strong>{plan.id==='starter'&&uat.active?'Free':pesos(plan.monthlyPhp)}</strong><span>{plan.monthlyPhp===0||(plan.id==='starter'&&uat.active)?'':plan.id==='school'?'starting / month*':'/ month*'}</span></div>
          <p className="studio-price-qualifier">{plan.id==='starter'&&uat.active?'₱0 during the November UAT period':plan.priceQualifier}</p>
          <div className="studio-price-state">{plan.id==='starter'?(uat.active?'Open to verified members · ends November 30':'UAT ended · no paid subscription starts automatically'):plan.access}</div>
          <ul>{plan.highlights.map(feature=><li key={feature}>{feature}</li>)}</ul>
          <a href={plan.id==='starter'&&uat.active?'/dashboard?register=1':'/studio'} className="studio-price-link">{plan.id==='starter'?(uat.active?'Join free Student / Hobby UAT':'Open free Studio'):plan.button} →</a>
        </article>)}</div>
      <p className="studio-price-disclaimer">* {pricing.disclaimer}</p>
      <div className="studio-price-explain">
        <div><h2>What makes a cloud compiler different?</h2><p>Compilation uses isolated compute time, downloaded board platforms and libraries, and sometimes paid AI tokens. Unlike the free template library, UAT uses verified accounts and enforced allowances. Each build has a four-minute execution limit; Uno, ESP8266, ESP32 and M5Core are supported compiler targets.</p></div>
        <div><h2>Can teachers use it free?</h2><p>Teachers and students can use public guides free and join the Student / Hobby UAT with a verified account during the published period. Classroom dashboards and shared paid quotas remain future features.</p></div>
        <div><h2>Will schematics always be correct?</h2><p>No. The current free diagrams belong to reviewed educational templates and are labelled as illustrative functional connections. AI-generated hardware designs are not automatically treated as electrically validated.</p></div>
        <div><h2>How will subscriptions work?</h2><p>No checkout or recurring billing is active. UAT access ends automatically at the published deadline. Existing private projects remain readable, and public guided examples and browser tools remain available. No account converts automatically to a paid plan.</p></div>
      </div>
      <div className="studio-price-bottom"><h2>Start with what is available today</h2><p>Use your CircuitByte catalog items to get an editable Arduino sketch, connection references and a printable project pack.</p><a href="/studio" className="edu-button">Open Project Studio →</a></div>
    </section>
  </EducationShell>;
}
