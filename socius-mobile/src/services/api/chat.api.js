import { api as client } from './client';

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
