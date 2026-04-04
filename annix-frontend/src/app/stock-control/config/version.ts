/**
 * Versioning rules (major.minor.patch):
 *
 * - patch (+1): Bug fixes, tweaks, formatting, enhancements to existing features,
 *   improving existing behaviour (e.g. multi-DN linking, inline editing, discount detection)
 * - minor (+1, patch resets to 0): Entirely NEW features or pages that didn't exist before
 *   (e.g. a new "Reports" page, a new module like PosiTector integration)
 * - major (+1, minor and patch reset to 0): Major redesigns, breaking UX changes, architectural overhauls
 * - When patch reaches 100, minor increments by 1 and patch resets to 0
 * - When minor increments for any reason, patch resets to 0
 */
export const STOCK_CONTROL_VERSION = "2.28.3";
