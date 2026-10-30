// CircuitByte learning-content integrity check.
// Does not need database credentials, third-party services, or network access.
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const load = async (file) => JSON.parse(await readFile(resolve(root, file), 'utf8'));
const [lessons, projects, products, references] = await Promise.all([
  load('content/foundation-lessons.json'),
  load('content/diy-projects.json'),
  load('content/product-learning.json'),
  load('content/references.json'),
]);

const failures = [];
const requireFile = async (file, context) => {
  try { await access(resolve(root, file)); }
  catch { failures.push(`${context}: missing ${file}`); }
};
const seenLesson = new Set();
const seenDIY = new Set();

for (const lesson of lessons) {
  if (!lesson.slug || seenLesson.has(lesson.slug)) failures.push(`Duplicate/invalid lesson slug: ${lesson.slug}`);
  seenLesson.add(lesson.slug);
  if (!lesson.title || !lesson.intro) failures.push(`Incomplete lesson: ${lesson.slug}`);
  for (const [id] of lesson.parts || []) {
    if (!(id in products)) failures.push(`Lesson ${lesson.slug}: unknown product ${id}`);
  }
  for (const ref of lesson.references || []) {
    if (!Array.isArray(ref) || !String(ref[1] || '').startsWith('https://')) {
      failures.push(`Lesson ${lesson.slug}: invalid reference`);
    }
  }
}

for (const project of projects) {
  if (!project.slug || seenDIY.has(project.slug)) failures.push(`Duplicate/invalid DIY slug: ${project.slug}`);
  seenDIY.add(project.slug);
  if (!project.title || !project.introduction || !project.steps?.length) {
    failures.push(`Incomplete DIY guide: ${project.slug}`);
  }
  for (const part of project.parts || []) {
    if (!(part.id in products)) failures.push(`DIY ${project.slug}: unknown product ${part.id}`);
  }
  for (const key of project.sources || []) {
    if (!(key in references)) failures.push(`DIY ${project.slug}: unknown reference ${key}`);
  }
  if (project.code) await requireFile(`public/education/code/${project.code}`, project.slug);
  for (const kind of ['schematic', 'wiring', 'flow']) {
    await requireFile(`public/education/diagrams/${project.slug}-${kind}.svg`, project.slug);
  }
}

assert(Array.isArray(lessons) && Array.isArray(projects), 'Invalid learning JSON structure');
if (failures.length) {
  console.error(`Learning-content validation failed (${failures.length}):\n${failures.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${lessons.length} lessons, ${projects.length} DIY guides, ${Object.keys(products).length} product profiles and ${Object.keys(references).length} source references.`);
}
