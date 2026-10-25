import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
dotenv.config();

const baseURL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

export async function requestPrediction(file) {
  const form = new FormData();
  form.append('file', file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype,
  });
  const response = await axios.post(`${baseURL}/api/detect`, form, {
    headers: form.getHeaders(),
    maxBodyLength: 25 * 1024 * 1024,
    maxContentLength: 25 * 1024 * 1024,
    timeout: 120000,
  });
  return response.data;
}
