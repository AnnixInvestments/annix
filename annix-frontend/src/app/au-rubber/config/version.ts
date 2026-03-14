/**
 * Versioning rules (major.minor.patch):
 *
 * - patch (+1): Small updates, bug fixes, tweaks, formatting changes
 * - minor (+1, patch resets to 0): New features, new pages, significant enhancements
 * - major (+1, minor and patch reset to 0): Major redesigns, breaking UX changes, architectural overhauls
 * - When patch reaches 100, minor increments by 1 and patch resets to 0
 * - When minor increments for any reason, patch resets to 0
 */
export const AU_RUBBER_VERSION = "2.1.1";
