import {EducationShell} from '../../education/shell';
import pricing from '../../../content/studio-pricing.json';
import './pricing.css';

export const metadata={
  title:'CircuitByte Project Studio — Pricing Preview',
  description:'Explore proposed Philippine prices for future Arduino AI Project Studio SaaS plans. No paid subscriptions are available yet.'
};

const pesos=value=>value===0?'Free':'₱'+value.toLocaleString('en-PH');

export default function StudioPricing(){
  return <EducationShell active="studio">
    <section className="studio-price-hero">
      <div className="studio-price-heading">
        <span className="edu-kicker">CIRCUITBYTE / PRICING PREVIEW</span>
        <h1>Learn for free. <em>Grow when you're ready.</em></h1>
        <p>Our suggested plans for a future AI-enabled Arduino development service. <strong>Only the guided Studio features are live.</strong> AI generation, paid cloud compilation, subscriptions and school seats are not currently being sold.</p>
        <a href="/studio" className="edu-button">Explore the free Studio →</a>
      </div>
      <div className="studio-price-banner" role="note"><strong>Proposed prices — no billing active</strong><p>These are planning estimates in Philippine pesos. Nobody will be charged or asked for payment through this page.</p></div>
    </section>
    <section className="studio-price-main" aria-label="Proposed membership plans">
      <div className="studio-price-grid">{pricing.plans.map(plan=>
        <article key={plan.id} className={'studio-price-card '+(plan.id==='starter'?'studio-price-featured':'')}>
          <div className="studio-price-category">{plan.id==='free'?'CURRENT GUIDED ACCESS':'FUTURE / NOT FOR SALE'}</div>
          <h2>{plan.name}</h2><p className="studio-price-audience">{plan.audience}</p>
          <div className="studio-price-amount"><strong>{pesos(plan.monthlyPhp)}</strong><span>{plan.monthlyPhp===0?'':plan.id==='school'?'starting / month*':'/ month*'}</span></div>
          <p className="studio-price-qualifier">{plan.priceQualifier}</p>
          <div className="studio-price-state">{plan.access}</div>
          <ul>{plan.highlights.map(feature=><li key={feature}>{feature}</li>)}</ul>
          <a href="/studio" className="studio-price-link">{plan.button} →</a>
        </article>)}</div>
      <p className="studio-price-disclaimer">* {pricing.disclaimer}</p>
      <div className="studio-price-explain">
        <div><h2>What makes a cloud compiler different?</h2><p>Compilation uses isolated compute time, downloaded board platforms and libraries, and sometimes paid AI tokens. Unlike the free template library, those services need secure accounts, fair-use limits and spend controls before public access.</p></div>
        <div><h2>Can teachers use it free?</h2><p>The guided example library, code downloads, published diagrams, pin maps, and browser Save as PDF project sheets are free. Classroom dashboards and shared paid quotas are future features only.</p></div>
        <div><h2>Will schematics always be correct?</h2><p>No. The current free diagrams belong to reviewed educational templates and are labelled as illustrative functional connections. AI-generated hardware designs are not automatically treated as electrically validated.</p></div>
        <div><h2>How will subscriptions work?</h2><p>No checkout is implemented. Pricing, resource quotas, Philippine taxes, support and refund terms must be finalized before accepting recurring payments. We will not automatically enable an unlimited compiler tier.</p></div>
      </div>
      <div className="studio-price-bottom"><h2>Start with what is available today</h2><p>Use your CircuitByte catalog items to get an editable Arduino sketch, connection references and a printable project pack.</p><a href="/studio" className="edu-button">Open Project Studio →</a></div>
    </section>
  </EducationShell>;
}
