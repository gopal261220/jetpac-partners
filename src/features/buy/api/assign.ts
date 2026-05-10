import axios from 'axios';

import { TENANT_ID_STRING } from '../../../constants/app';
import { getCandidateApiBaseUrls } from './runtime';

const ASSIGN_TIMEOUT_MS = 8000;

type AssignPackRequest = {
  catalogId: string;
  receiverUserId?: string;
};

export async function assignPackOrders(requests: AssignPackRequest[]) {
  let lastError: unknown = null;

  for (const baseUrl of getCandidateApiBaseUrls()) {
    try {
      await Promise.all(
        requests.map((request) =>
          axios.post(
            `${baseUrl}/api/packs/assign`,
            {
              tenant_id: TENANT_ID_STRING,
              catalog_id: request.catalogId,
              ...(request.receiverUserId ? { receiver_user_id: request.receiverUserId } : {}),
            },
            {
              timeout: ASSIGN_TIMEOUT_MS,
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
            }
          )
        )
      );

      return true;
    } catch (error) {
      lastError = error;
    }
  }

  if (axios.isAxiosError(lastError) && lastError.code === 'ETIMEDOUT') {
    throw new Error('Assignment service took too long to respond.');
  }

  throw lastError;
}
