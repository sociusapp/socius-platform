import { api as client } from './client';

const authHeaders = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

export const getSessionByRequest = async (token, requestId) => {
  const response = await client.get(`/chat/request/${requestId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getMessages = async (token, sessionId, page = 1) => {
  const response = await client.get(`/chat/session/${sessionId}/messages?page=${page}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const sendMessage = async (token, sessionId, text, replyToId = null) => {
  const response = await client.post(
    `/chat/session/${sessionId}/messages`,
    { text, replyToId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

/** Rich message (location / media URLs from prior upload) */
export const sendRichMessage = async (token, sessionId, payload) => {
  const response = await client.post(`/chat/session/${sessionId}/messages`, payload, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30000,
  });
  return response.data;
};

/**
 * Upload chat attachment (image, audio, pdf, doc). `file` is React Native FormData shape: { uri, name, type }.
 */
export const uploadChatMedia = async (token, sessionId, file, onProgress) => {
  const form = new FormData();
  form.append('file', file);
  const response = await client.post(`/chat/session/${sessionId}/media`, form, {
    headers: {
      ...authHeaders(token),
      'Content-Type': 'multipart/form-data',
    },
    timeout: 120000,
    onUploadProgress: (e) => {
      if (typeof onProgress === 'function' && e.total > 0) {
        onProgress(e.loaded / e.total);
      }
    },
  });
  return response.data;
};

export const markMessagesRead = async (token, sessionId) => {
  const response = await client.patch(
    `/chat/session/${sessionId}/read`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const reactToMessage = async (token, messageId, emoji) => {
  const response = await client.post(
    `/chat/messages/${messageId}/react`,
    { emoji },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};
