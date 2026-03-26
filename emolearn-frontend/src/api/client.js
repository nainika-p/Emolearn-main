const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
  
}

export const api = {
  analyze: (userId, message) =>
    request('/analyze', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, message }),
    }),

chat: (userId, message, emotion, history) =>
  request('/chat', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      message,
      emotion,
      history,
    }),
  }),

  correct: (userId, messageId, correctedEmotion) =>
    request('/correct', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        message_id: messageId,
        corrected_emotion: correctedEmotion,
      }),
    }),

  confirm: (userId, messageId) =>
    request('/confirm', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, message_id: messageId }),
    }),

  history: (userId) => request(`/history/${userId}`),
  stats: (userId) => request(`/stats/${userId}`),
  dashboard: (userId) => request(`/dashboard/${userId}`),
};

