// The CV lives in Supabase Storage at a fixed path, so uploading a new one
// replaces it and /cv.pdf (rewritten in next.config.ts) always serves the latest.
export const CV_BUCKET = 'site-files';
export const CV_PATH = 'cv.pdf';
export const CV_MAX_BYTES = 5 * 1024 * 1024;
export const CV_MAX_LABEL = 'PDF, max 5MB';
