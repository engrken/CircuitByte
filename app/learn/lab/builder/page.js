import {EducationShell} from '../../../education/shell';
import {CircuitBuilder} from './workspace';
import './builder.css';
import './dc-instruments.css';
export const metadata={title:'Circuit Builder | CircuitByte Interactive Lab',description:'Build and measure supported Arduino Uno DC circuits on an interactive breadboard with static safety screening and virtual multimeter.'};
export default function CircuitBuilderPage(){return <EducationShell active="learn"><CircuitBuilder/></EducationShell>;}
