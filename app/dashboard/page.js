import {EducationShell} from '../education/shell';
import StudioAccount from './client';
import './dashboard.css';
export const metadata={title:'My CircuitByte Dashboard',description:'Your Arduino Studio projects and private educational profile.'};
export default function Dashboard(){return <EducationShell active="dashboard"><StudioAccount/></EducationShell>;}
