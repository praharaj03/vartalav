/** Canonical public origin used when sharing meeting invitations. */
export const getAppBaseUrl = (fallbackOrigin: string) => {
  const configuredUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (!configuredUrl) return fallbackOrigin.replace(/\/$/, '');

  try {
    const parsedUrl = new URL(configuredUrl);
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return fallbackOrigin.replace(/\/$/, '');
    }
    return parsedUrl.origin;
  } catch {
    return fallbackOrigin.replace(/\/$/, '');
  }
};
