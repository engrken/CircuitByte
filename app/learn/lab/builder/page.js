import {EducationShell} from '../../../education/shell';
import {CircuitBuilder} from './workspace';
import './builder.css';
export const metadata={title:'Circuit Builder | CircuitByte Interactive Lab',description:'Build and inspect Arduino Uno breadboard connections with live electrical-net checks, 3D perspective and 2D connection maps.'};
export default function CircuitBuilderPage(){return <EducationShell active="learn"><CircuitBuilder/></EducationShell>;}
