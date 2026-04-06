import axios from 'axios';
import { api, baseURL } from './client';

const authConfig = (token) =>
  token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : undefined;

const normalizeFileInfo = (uri, fallbackName) => {
  if (!uri) {
    return { name: fallbackName, ext: 'jpg' };
  }

  const [pathPart] = String(uri).split('?');
  const filename = pathPart.split('/').pop() || fallbackName;
  const extMatch = /\.(\w+)$/.exec(filename);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';

  return { name: filename, ext };
};

const updateSelfie = async (token, selfieUri) => {
  const formData = new FormData();

  if (selfieUri) {
    const { name, ext } = normalizeFileInfo(selfieUri, 'selfie.jpg');
    const mimeType =
      ext === 'png'
        ? 'image/png'
        : 'image/jpeg';

    formData.append('selfie', {
      uri: selfieUri,
      name: name,
      type: mimeType,
    });
  }

  const client = axios.create({
    baseURL,
    headers: {
      ...(authConfig(token)?.headers || {}),
      'Content-Type': 'multipart/form-data',
    },
  });

  const response = await client.patch('/verification/selfie', formData);
  return response.data;
};

const submitVerificationDocuments = async (token, { governmentIdUri, selfieUri }) => {
  const formData = new FormData();

  if (governmentIdUri) {
    const { name, ext } = normalizeFileInfo(governmentIdUri, 'document.jpg');
    const mimeType =
      ext === 'pdf'
        ? 'application/pdf'
        : ext === 'png'
        ? 'image/png'
        : 'image/jpeg';

    formData.append('government_id', {
      uri: governmentIdUri,
      name: name,
      type: mimeType,
    });
  }

  if (selfieUri) {
    const { name, ext } = normalizeFileInfo(selfieUri, 'selfie.jpg');
    const mimeType =
      ext === 'png'
        ? 'image/png'
        : 'image/jpeg';

    formData.append('selfie', {
      uri: selfieUri,
      name: name,
      type: mimeType,
    });
  }

  const client = axios.create({
    baseURL,
    headers: {
      ...(authConfig(token)?.headers || {}),
      'Content-Type': 'multipart/form-data',
    },
  });

  const response = await client.post('/verification/submit', formData);
  return response.data;
};

const retryVerification = async (token, { governmentIdUri, selfieUri }) => {
  const formData = new FormData();

  if (governmentIdUri) {
    const { name, ext } = normalizeFileInfo(governmentIdUri, 'document.jpg');
    const mimeType =
      ext === 'pdf'
        ? 'application/pdf'
        : ext === 'png'
        ? 'image/png'
        : 'image/jpeg';

    formData.append('government_id', {
      uri: governmentIdUri,
      name: name,
      type: mimeType,
    });
  }

  if (selfieUri) {
    const { name, ext } = normalizeFileInfo(selfieUri, 'selfie.jpg');
    const mimeType =
      ext === 'png'
        ? 'image/png'
        : 'image/jpeg';

    formData.append('selfie', {
      uri: selfieUri,
      name: name,
      type: mimeType,
    });
  }

  const client = axios.create({
    baseURL,
    headers: {
      ...(authConfig(token)?.headers || {}),
      'Content-Type': 'multipart/form-data',
    },
  });

  const response = await client.post('/verification/retry', formData);
  return response.data;
};

const getVerificationStatus = (token) => {
  return api
    .get('/verification', authConfig(token))
    .then((response) => response.data);
};

export { submitVerificationDocuments, retryVerification, getVerificationStatus, updateSelfie };
