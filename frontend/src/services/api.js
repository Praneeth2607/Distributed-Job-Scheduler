import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  withCredentials: true, // Crucial for sending/receiving our HttpOnly JWT cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Setup response interceptors for global error handling if needed
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we get a 401 Unauthorized globally, we could redirect to login here
    return Promise.reject(error);
  }
);
