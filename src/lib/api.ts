import axios from "axios";

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api",
});

// Optional: add auth header if you use DRF Token/JWT
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token"); // or cookie-based
    if (token) config.headers.Authorization = `Token ${token}`; // or `Bearer ${token}`
    return config;
});
