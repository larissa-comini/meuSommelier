import type { ImportJob } from './types';

export type ImportDrafts = Record<number, Record<string, string>>;

export function reviewRows(job: ImportJob, onlyProblems: boolean) {
  return job.preview.map((row, index) => ({ ...row, index })).filter(row => !onlyProblems || !row.valid);
}

export function reviewChanges(drafts: ImportDrafts) {
  return Object.entries(drafts).flatMap(([index, values]) => Object.entries(values).map(([field, value]) => ({ index: Number(index), field, value })));
}

export function reviewMessage(job: ImportJob) {
  const count = job.preview.filter(row => !row.valid).length;
  if (!count) return 'Tudo pronto para adicionar à sua carta';
  return count === 1 ? '1 vinho precisa da sua revisão' : `${count} vinhos precisam da sua revisão`;
}
