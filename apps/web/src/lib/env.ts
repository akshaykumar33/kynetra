/** Base URL of the platform API. Set NEXT_PUBLIC_API_URL for non-local environments. */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(
  /\/$/,
  '',
);

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
