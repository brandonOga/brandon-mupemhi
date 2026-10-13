import type { CaseStudy } from './projects';

// The problem-and-process and solution sections are each one rich-text field.
// Projects saved before that hold the same copy as separate plain fields;
// these helpers fold those into equivalent HTML so the editor can pre-fill
// from them and the project page can render every project the same way.

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const paragraphs = (value: string) =>
  value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join('');
const items = (values: string[]) => values.map((value) => `<li><p>${escapeHtml(value)}</p></li>`).join('');

export function problemProcessHtml(caseStudy?: CaseStudy): string {
  if (!caseStudy) return '';
  if (caseStudy.problem_process) return caseStudy.problem_process;
  return [
    caseStudy.challenge_question && `<h3>${escapeHtml(caseStudy.challenge_question)}</h3>`,
    paragraphs(caseStudy.challenge),
    caseStudy.understanding && `<h3>Understanding the problem</h3>${paragraphs(caseStudy.understanding)}`,
    caseStudy.insights.length > 0 && `<h3>Key insights</h3><ul>${items(caseStudy.insights)}</ul>`,
    caseStudy.process_steps.length > 0 && `<h3>Process</h3><ol>${items(caseStudy.process_steps)}</ol>`,
    caseStudy.exploration && `<h3>Exploration</h3>${paragraphs(caseStudy.exploration)}`,
  ].filter(Boolean).join('');
}

export function solutionHtml(caseStudy?: CaseStudy): string {
  if (!caseStudy) return '';
  if (caseStudy.solution_detail) return caseStudy.solution_detail;
  return [
    paragraphs(caseStudy.solution),
    ...caseStudy.features.map((feature) =>
      `${feature.title ? `<h3>${escapeHtml(feature.title)}</h3>` : ''}${paragraphs(feature.description)}`),
  ].filter(Boolean).join('');
}
