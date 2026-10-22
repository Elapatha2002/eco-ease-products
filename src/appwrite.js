import { Account, Client, ID, Storage, TablesDB } from 'appwrite';
import { config, isConfigured } from './config.js';
import { productRow } from './catalog.js';

const client = isConfigured ? new Client().setEndpoint(config.endpoint).setProject(config.projectId) : null;
const account = client ? new Account(client) : null;
const storage = client ? new Storage(client) : null;
const tables = client ? new TablesDB(client) : null;

export const auth = {
  current: () => account.get(),
  login: (email, password) => account.createEmailPasswordSession({ email, password }),
  logout: () => account.deleteSession({ sessionId: 'current' }),
  requestPasswordReset: (email) => account.createRecovery({
    email,
    url: `${window.location.origin}${window.location.pathname}`,
  }),
  completePasswordReset: (userId, secret, password) => account.updateRecovery({
    userId, secret, password,
  }),
};

export async function submitProduct(data, images, user, onProgress, submission) {
  // Keep upload IDs in memory if the row write needs a retry. The submission ID
  // is stable across retries; a duplicate row ID means the first write succeeded.
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    if (image.uploadId) continue;
    onProgress(`Uploading photo ${i + 1} of ${images.length}…`);
    const file = await storage.createFile({
      bucketId: config.bucketId,
      fileId: ID.unique(),
      file: image.file,
      permissions: [],
    });
    image.uploadId = file.$id;
  }
  onProgress('Saving product details…');
  return tables.createRow({
    databaseId: config.databaseId,
    tableId: config.tableId,
    rowId: submission.id,
    data: productRow(data, images, user, submission.id),
    permissions: [],
  });
}

export const newSubmission = () => ({ id: ID.unique() });
