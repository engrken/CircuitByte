import {EducationShell} from '../../../education/shell';
import {CircuitBuilder} from './workspace';
import './builder.css';
import './dc-instruments.css';
import './laboratory.css';
export const metadata={title:'Virtual Electronics Laboratory | CircuitByte',description:'Complete guided low-voltage electronics experiments in a connected virtual breadboard: voltage dividers, potentiometers, LEDs, LDRs, and recorded measurements.'};
export default function CircuitBuilderPage(){return <EducationShell active="learn"><CircuitBuilder/></EducationShell>;}
