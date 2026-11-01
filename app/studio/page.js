import { EducationShell } from '../education/shell';
import catalog from '../../scripts/catalog.json';
import specs from '../../content/studio-project-specs.json';
import { StudioWorkspace } from './workspace';
import './studio.css';

export const metadata = {
  title: 'Arduino Project Studio | CircuitByte',
  description: 'Choose real electronic parts, describe a circuit idea, get an editable Arduino sketch, pin map and controlled multi-board compilation.'
};

export default function StudioPage() {
  const parts = catalog.map(item=>({id:item.id,name:item.name,description:String(item.description||'').slice(0,150),category:item.categories?.[0]||'components',price:Number.isFinite(item.price)?item.price:null}));
  return <EducationShell active="studio">
    <section className="studio-hero">
      <div><span className="edu-kicker">CIRCUITBYTE PROJECT STUDIO</span>
        <h1>From parts to <em>Arduino code.</em></h1>
        <p>Choose the hardware you have, describe what you want it to do, and start from a catalog-linked Arduino design. Inspect the connections and edit the sketch before compiling or building.</p>
        <div className="studio-hero-links"><a href="#workspace" className="edu-button">Open workspace →</a><a href="/diy">See guided projects</a><a href="/studio/pricing">Pricing plans</a></div>
      </div>
      <aside className="studio-hero-card"><span>01  PICK YOUR PARTS</span><span>02  DESCRIBE THE IDEA</span><span>03  REVIEW THE SKETCH</span><span>04  COMPILE &amp; TEST</span><p>Guided templates and editable sketches are publicly available. Cloud compilation requires an enabled service and verified login. USB flashing supports Uno R3 ATmega328P Optiboot in Web Serial-capable browsers.</p></aside>
    </section>
    <StudioWorkspace parts={parts} specs={specs}/>
  </EducationShell>;
}
