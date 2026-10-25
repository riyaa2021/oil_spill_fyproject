import axios from 'axios';
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const api = axios.create({ baseURL: API, timeout: 130000 });
export async function detectImage(file) { const form = new FormData(); form.append('file', file); return (await api.post('/detect', form)).data; }
export async function fetchHistory() { return (await api.get('/history')).data.history || []; }
export async function fetchAnalytics() { return (await api.get('/analytics')).data; }
export async function deleteHistory() { return (await api.delete('/history')).data; }
