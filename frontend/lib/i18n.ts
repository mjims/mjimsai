import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  if (!locale || !['en', 'fr'].includes(locale)) {
    locale = 'fr'; // Default to French if invalid or missing
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
