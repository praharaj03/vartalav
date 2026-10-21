/** Canonical public origin used when sharing meeting invitations. */
const DEFAULT_PUBLIC_ORIGIN = 'https://vaartalav-k6vm-khaki.vercel.app';

export const getAppBaseUrl = () => {
  const configuredUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (!configuredUrl) return DEFAULT_PUBLIC_ORIGIN;

  try {
    const parsedUrl = new URL(configuredUrl);
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return DEFAULT_PUBLIC_ORIGIN;
    }
    return parsedUrl.origin;
  } catch {
    return DEFAULT_PUBLIC_ORIGIN;
  }
};
