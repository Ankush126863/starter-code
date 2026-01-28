import axios from 'axios';

// const api = axios.create({
//   baseURL: '/api',
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });
const api = axios.create({
  baseURL: "http://localhost:3001/api", // must match your backend
});
// ==========================
// Request Interceptor
// ==========================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ==========================
// Response Interceptor
// ==========================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // ✅ Redirect ONLY when token is invalid / expired
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // prevent redirect loop
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // ❌ DO NOT redirect for 403, 400, 500 etc
    return Promise.reject(error);
  }
);

// ==========================
// Reports API
// ==========================
export const getDailySummaryReport = (date, employeeId = null) => {
  const params = { date };

  if (employeeId) {
    params.employee_id = employeeId;
  }

  return api.get('/reports/daily-summary', { params });
};

export default api;
