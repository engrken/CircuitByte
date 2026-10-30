import {notFound} from 'next/navigation';
import {EducationShell} from '../../../education/shell';
import {LessonView,lessons} from '../../../education/foundations';

export function generateStaticParams(){
  return lessons.map(lesson=>({slug:lesson.slug}));
}

export async function generateMetadata({params}){
  const {slug}=await params;
  const lesson=lessons.find(l=>l.slug===slug);
  return {
    title:lesson?lesson.title+' | CircuitByte Learn':'Lesson not found | CircuitByte',
    description:lesson?.intro||'CircuitByte beginner electronics lessons'
  };
}

export default async function FoundationLesson({params}){
  const {slug}=await params;
  const lesson=lessons.find(l=>l.slug===slug);
  if(!lesson)notFound();
  return <EducationShell><LessonView lesson={lesson}/></EducationShell>;
}
