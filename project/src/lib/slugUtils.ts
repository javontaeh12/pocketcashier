const RESERVED_SLUGS = [
  'admin', 'login', 'logout', 'api', 'settings', 'dashboard',
  'auth', 'supabase', 'b', 'business', 'businesses', 'account',
  'onboarding', 'signup', 'signin', 'register', 'profile', 'profiles',
  'user', 'users', 'developer', 'dev', 'docs', 'documentation',
  'help', 'support', 'about', 'contact', 'terms', 'privacy',
  'checkout', 'cart', 'payment', 'payments', 'order', 'orders',
  'booking', 'bookings', 'event', 'events', 'review', 'reviews',
  'home', 'index', 'root', 'public', 'static', 'assets'
];

export interface SlugValidationResult {
  valid: boolean;
  error?: string;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase());
}

export function validateSlugFormat(slug: string): SlugValidationResult {
  if (!slug || slug.trim() === '') {
    return { valid: false, error: 'Business page name is required' };
  }

  const trimmed = slug.trim();

  if (trimmed.length < 3) {
    return { valid: false, error: 'Must be at least 3 characters' };
  }

  if (trimmed.length > 60) {
    return { valid: false, error: 'Must be 60 characters or less' };
  }

  if (!/^[a-z0-9]/.test(trimmed)) {
    return { valid: false, error: 'Must start with a letter or number' };
  }

  if (!/[a-z0-9]$/.test(trimmed)) {
    return { valid: false, error: 'Must end with a letter or number' };
  }

  if (!/^[a-z0-9-]+$/.test(trimmed)) {
    return { valid: false, error: 'Can only contain lowercase letters, numbers, and hyphens' };
  }

  if (/[A-Z]/.test(trimmed)) {
    return { valid: false, error: 'Must be lowercase only' };
  }

  if (/--/.test(trimmed)) {
    return { valid: false, error: 'Cannot contain consecutive hyphens' };
  }

  if (isReservedSlug(trimmed)) {
    return { valid: false, error: 'This name is reserved and cannot be used' };
  }

  return { valid: true };
}

export function getSlugSuggestion(businessName: string): string {
  const slugified = slugify(businessName);

  if (slugified.length < 3) {
    return '';
  }

  if (slugified.length > 60) {
    return slugified.substring(0, 60).replace(/-+$/, '');
  }

  return slugified;
}

export function getPublicBusinessUrl(slug: string): string {
  const baseUrl = import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin;
  return `${baseUrl}/${slug}`;
}
