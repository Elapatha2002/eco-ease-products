export const config = {
  endpoint: (import.meta.env.VITE_APPWRITE_ENDPOINT || '').trim(),
  projectId: (import.meta.env.VITE_APPWRITE_PROJECT_ID || '').trim(),
  databaseId: (import.meta.env.VITE_APPWRITE_DATABASE_ID || '').trim(),
  tableId: (import.meta.env.VITE_APPWRITE_TABLE_ID || '').trim(),
  bucketId: (import.meta.env.VITE_APPWRITE_BUCKET_ID || '').trim(),
};

export const isConfigured = Object.values(config).every(Boolean) &&
  /^https:\/\//.test(config.endpoint);
