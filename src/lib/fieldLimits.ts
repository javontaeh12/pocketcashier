const FIELD_LIMITS = {
  URL_SLUG: 45,
  SQUARE_LOCATION_ID: 45,
  BUSINESS_NAME: 255,
  HERO_MESSAGE: 200,
} as const;

export { FIELD_LIMITS };

export function truncateToLimit(value: string | null | undefined, limitKey: keyof typeof FIELD_LIMITS): string {
  if (!value) return '';
  const limit = FIELD_LIMITS[limitKey];
  return value.slice(0, limit);
}

export function enforceFieldLimit(value: string | null | undefined, limitKey: keyof typeof FIELD_LIMITS): boolean {
  if (!value) return true;
  const limit = FIELD_LIMITS[limitKey];
  return value.length <= limit;
}

export function getFieldLimit(limitKey: keyof typeof FIELD_LIMITS): number {
  return FIELD_LIMITS[limitKey];
}

export const FIELD_LIMITS_CONST = FIELD_LIMITS;
