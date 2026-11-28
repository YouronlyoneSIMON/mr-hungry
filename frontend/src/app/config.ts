// Local development uses your laptop. Any other address uses the live backend.
// After deploying the backend, replace the second address with your real backend URL.
export const API_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : 'https://YOUR-BACKEND.onrender.com';