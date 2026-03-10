import { api } from './client';

const authConfig = (token) =>
  token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : undefined;

const acceptHelpAsVolunteer = (token, requestId) => {
  return api
    .patch(
      `/help-request/${encodeURIComponent(requestId)}/accept`,
      undefined,
      authConfig(token)
    )
    .then((response) => response.data);
};

const declineHelpAsVolunteer = (token, requestId) => {
  return api
    .patch(
      `/help-request/${encodeURIComponent(requestId)}/decline`,
      undefined,
      authConfig(token)
    )
    .then((response) => response.data);
};

const acceptPresenceAsVolunteer = (token, presenceId) => {
  return api
    .patch(
      `/presence/${encodeURIComponent(presenceId)}/accept`,
      undefined,
      authConfig(token)
    )
    .then((response) => response.data);
};

const declinePresenceAsVolunteer = (token, presenceId) => {
  return api
    .patch(
      `/presence/${encodeURIComponent(presenceId)}/decline`,
      undefined,
      authConfig(token)
    )
    .then((response) => response.data);
};

export {
  acceptHelpAsVolunteer,
  declineHelpAsVolunteer,
  acceptPresenceAsVolunteer,
  declinePresenceAsVolunteer,
};
