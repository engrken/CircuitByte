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
    <section className="studio-hero studio-hero-compact">
      <div><span className="edu-kicker">CIRCUITBYTE / STUDIO</span><h1>Your electronics workbench.</h1><p>Choose your board and parts, describe your idea, then review the code and wiring.</p></div>
      <div className="studio-hero-links"><a href="/learn/lab">Interactive Arduino Lab ↗</a><a href="/learn/lab/builder">Circuit Builder ↗</a><a href="/diy">Project guides ↗</a><a href="/dashboard">My projects ↗</a></div>
    </section>
    <StudioWorkspace parts={parts} specs={specs} releaseRevision={process.env.VERCEL_GIT_COMMIT_SHA||''}/>
  </EducationShell>;
}
