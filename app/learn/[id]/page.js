import {notFound} from 'next/navigation';
import {EducationShell} from '../../education/shell';
import {ProductLesson} from '../../education/library';
import profiles from '../../../content/product-learning.json';
export function generateStaticParams(){return Object.keys(profiles).map(id=>({id}));}
export async function generateMetadata({params}){const {id}=await params;return {title:`Component ${id} | CircuitByte Learning Lab`};}
export default async function Page({params}){const {id}=await params;if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id))notFound();return <EducationShell><ProductLesson id={id}/></EducationShell>}
