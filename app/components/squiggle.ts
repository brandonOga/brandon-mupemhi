// Shared squiggle asset for the page-transition curtain and the preloader
// exit, so both draw/erase the exact same shape.
export const SQUIGGLE_PATH_D =
  "M13.4746 291.27C13.4746 291.27 100.646 -18.6724 255.617 16.8418C410.588 52.356 61.0296 431.197 233.017 546.326C431.659 679.299 444.494 21.0125 652.73 100.784C860.967 180.556 468.663 430.709 617.216 546.326C765.769 661.944 819.097 48.2722 988.501 120.156C1174.21 198.957 809.424 543.841 988.501 636.726C1189.37 740.915 1301.67 149.213 1301.67 149.213";
export const SQUIGGLE_VIEWBOX = "0 0 1316 664";
export const SQUIGGLE_COLOR = "#F59E0B";

// Percentages of the viewport diagonal rather than fixed px, so the blob
// scales with viewport/container size instead of reading thin on large
// screens or oversized on small ones.
export const SQUIGGLE_STROKE_THIN = "0.2%";
export const SQUIGGLE_STROKE_THICK = "29%";
