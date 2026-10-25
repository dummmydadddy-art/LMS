import axios from 'axios';
import { supabase } from '../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  if (config.url && config.url.includes('/api/rag/')) {
    config.headers['X-Service-Key'] = 'lms-n8n-service-key-2026';
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
