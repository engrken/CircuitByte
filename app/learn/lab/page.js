import {EducationShell} from '../../education/shell';
import {InteractiveLab} from './workbench';
import './lab.css';
export const metadata={title:'Interactive Arduino Lab | CircuitByte',description:'Explore an interactive 3D Arduino Uno teaching workbench, inspect components, and complete 16 guided electronics lessons.'};
export default function LabPage(){return <EducationShell active="learn"><InteractiveLab/></EducationShell>;}
