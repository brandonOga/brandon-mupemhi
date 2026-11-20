import 'server-only';

export const BUCKET = 'project-images';

/** Project columns that can hold image URLs: the cover, the gallery, the
 *  case-study media, and rich-text HTML in the case study and body. */
export const IMAGE_COLUMNS = 'id, name, cover_image, gallery, case_study, body';

export type ProjectImageRow = {
  id: string;
  name: string;
  cover_image: string | null;
  gallery: string[] | null;
  case_study: unknown;
  body: string | null;
};

/** Storage paths are a UUID plus extension; folders are allowed, `..` is not. */
export function isSafePath(path: string): boolean {
  return /^[\w.\-/]+$/.test(path) && !path.includes('..') && !path.startsWith('/');
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Matches any public URL of this bucket's file at `path`, with or without a
 *  query string, inside JSON-serialised project fields. */
export function urlPattern(path: string): RegExp {
  return new RegExp(`https?://[^"\\s]*?/${BUCKET}/${escapeRegExp(path)}(?:\\?[^"\\s\\\\]*)?(?=["\\s\\\\]|$)`, 'g');
}

export function imageFields(row: ProjectImageRow) {
  return { cover_image: row.cover_image, gallery: row.gallery, case_study: row.case_study, body: row.body };
}

export function usesPath(row: ProjectImageRow, path: string): boolean {
  return urlPattern(path).test(JSON.stringify(imageFields(row)));
}
