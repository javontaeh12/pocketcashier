export const FIELD_LIMITS = {
  URL_SLUG: 45,
  SQUARE_LOCATION_ID: 45,
  HERO_MESSAGE: 200,
} as const;

export function truncateField(value: string | null | undefined, limitKey: keyof typeof FIELD_LIMITS): string {
  if (!value) return '';
  const limit = FIELD_LIMITS[limitKey];
  return value.slice(0, limit);
}

export function validateField(value: string | null | undefined, limitKey: keyof typeof FIELD_LIMITS): boolean {
  if (!value) return true;
  const limit = FIELD_LIMITS[limitKey];
  return value.length <= limit;
}
