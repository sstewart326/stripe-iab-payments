export const getApiUrl = () => {
    // For development, use the explicit Firebase Functions emulator URL
    if (import.meta.env.DEV) {
      return import.meta.env.VITE_API_URL;
    }
    // For production, use relative URLs (which will hit the same domain)
    return '';
  };