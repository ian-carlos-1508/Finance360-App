/* src/lib/chartColors.ts */

/**
 * Centralized color palette for all recharts in the application.
 * This ensures consistency and makes theme changes easy.
 */

// 1. "Calm & Natural" Palette
// Used for multi-category charts (pie charts)
export const CHART_COLORS = [
  '#3D5A80', // Slate Blue
  '#98C1D9', // Light Blue
  '#EE6C4D', // Burnt Orange
  '#293241', // Deep Navy
  '#548C2F', // Olive Green
  '#8ECAE6', // Medium Sky Blue
  '#BFA181', // Muted Tan
  '#E0FBFC', // Pale Sky Blue
];

// 2. Primary Semantic Colors
// Use these for single-color charts
export const COLOR_INCOME = '#548C2F';   // Olive Green
export const COLOR_EXPENSE = '#EE6C4D';  // Burnt Orange
export const COLOR_TRANSFER = '#3D5A80'; // Slate Blue
export const COLOR_NEUTRAL = '#6b7280';  // Default Gray
export const COLOR_NET = '#548C2F';      // Olive Green