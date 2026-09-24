import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const columns = [
  'slug', 'name', 'description', 'year', 'role', 'tags', 'url', 'body',
  'case_industry', 'case_timeline', 'case_overview', 'case_responsibilities',
  'case_tools', 'case_challenge_question', 'case_challenge', 'case_understanding',
  'case_insights', 'case_process_steps', 'case_exploration', 'case_solution',
  'case_feature_1_title', 'case_feature_1_description',
  'case_feature_2_title', 'case_feature_2_description',
  'case_feature_3_title', 'case_feature_3_description',
  'case_feature_4_title', 'case_feature_4_description',
  'case_feature_5_title', 'case_feature_5_description',
  'case_design_system', 'case_development', 'case_responsive', 'case_outcome',
  'case_what_worked', 'case_improvements', 'cover_image', 'gallery',
  'case_media_challenge_1', 'case_media_challenge_2',
  'case_media_exploration_1', 'case_media_exploration_2', 'case_media_exploration_3',
  'case_media_solution', 'case_media_feature_1', 'case_media_feature_2',
  'case_media_feature_3', 'case_media_feature_4', 'case_media_feature_5',
  'case_media_responsive_mobile', 'case_media_responsive_tablet', 'case_media_responsive_desktop',
  'display_order', 'published',
] as const;

function csvCell(value: unknown): string {
  const text = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function flattenProject(project: Record<string, unknown>): Record<string, unknown> {
  const caseStudy = project.case_study && typeof project.case_study === 'object'
    ? project.case_study as Record<string, unknown>
    : {};
  const features = Array.isArray(caseStudy.features) ? caseStudy.features as Record<string, unknown>[] : [];
  const media = caseStudy.media && typeof caseStudy.media === 'object' && !Array.isArray(caseStudy.media)
    ? caseStudy.media as Record<string, unknown>
    : {};
  const lines = (value: unknown) => Array.isArray(value) ? value.map(String).join('\n') : '';

  return {
    ...project,
    tags: Array.isArray(project.tags) ? project.tags.join(', ') : '',
    gallery: lines(project.gallery),
    case_industry: caseStudy.industry,
    case_timeline: caseStudy.timeline,
    case_overview: caseStudy.overview,
    case_responsibilities: lines(caseStudy.responsibilities),
    case_tools: lines(caseStudy.tools),
    case_challenge_question: caseStudy.challenge_question,
    case_challenge: caseStudy.challenge,
    case_understanding: caseStudy.understanding,
    case_insights: lines(caseStudy.insights),
    case_process_steps: lines(caseStudy.process_steps),
    case_exploration: caseStudy.exploration,
    case_solution: caseStudy.solution,
    case_feature_1_title: features[0]?.title,
    case_feature_1_description: features[0]?.description,
    case_feature_2_title: features[1]?.title,
    case_feature_2_description: features[1]?.description,
    case_feature_3_title: features[2]?.title,
    case_feature_3_description: features[2]?.description,
    case_feature_4_title: features[3]?.title,
    case_feature_4_description: features[3]?.description,
    case_feature_5_title: features[4]?.title,
    case_feature_5_description: features[4]?.description,
    case_design_system: caseStudy.design_system,
    case_development: caseStudy.development,
    case_responsive: caseStudy.responsive,
    case_outcome: caseStudy.outcome,
    case_what_worked: lines(caseStudy.what_worked),
    case_improvements: lines(caseStudy.improvements),
    ...Object.fromEntries(Object.entries(media).map(([key, value]) => [`case_media_${key}`, value])),
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/admin/login', request.url));

  const result = await supabase
    .from('projects')
    .select('slug,name,description,body,case_study,cover_image,gallery,year,role,tags,url,display_order,published')
    .order('display_order', { ascending: true });

  let exportRows: Record<string, unknown>[] = (result.data ?? []) as Record<string, unknown>[];
  if (result.error) {
    // Older databases may not have received the structured case-study
    // migration yet. Keep backups available and emit an empty case_study cell.
    if (result.error.message.includes('case_study')) {
      const legacy = await supabase
        .from('projects')
        .select('slug,name,description,body,cover_image,gallery,year,role,tags,url,display_order,published')
        .order('display_order', { ascending: true });
      if (legacy.error) return NextResponse.json({ error: legacy.error.message }, { status: 500 });
      exportRows = (legacy.data ?? []).map((project) => ({ ...project, case_study: {} }));
    } else {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
  }

  const now = new Date();
  const csv = [
    columns.join(','),
    ...exportRows.map((project) => {
      const flat = flattenProject(project);
      return columns.map((column) => csvCell(flat[column])).join(',');
    }),
  ].join('\r\n');
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="portfolio-projects-${now.toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
