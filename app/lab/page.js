import Link from 'next/link';
import {EducationShell} from '../education/shell';
import {LabWorkspace} from './workspace';
import './lab.css';
export const metadata={title:'CircuitByte Lab | Virtual Electronics Workbench',description:'Explore components, create a virtual wiring plan, edit Arduino code and preview supported digital outputs.'};
export default function LabPage(){return <EducationShell active="studio"><main className="cb-lab"><header className="cb-lab-hero"><span>CIRCUITBYTE LAB / EARLY ACCESS</span><h1>Build. Wire. Code. Preview.</h1><p>A guided virtual electronics workbench connected to CircuitByte Project Studio. This first release offers a visual wiring plan and a limited, explicitly illustrative digital-output preview—not full circuit or microcontroller emulation.</p><Link href="/studio">Open full Arduino Project Studio →</Link></header><LabWorkspace/></main></EducationShell>}