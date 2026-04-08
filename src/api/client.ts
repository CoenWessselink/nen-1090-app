import axios, { AxiosError, AxiosRequestConfig } from "axios";

export const client = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
});

export const healthRequest = () => client.get("/health");

type RetryConfig = AxiosRequestConfig & { _retry?: boolean };
let refreshPromise: Promise<unknown> | null = null;

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = (error.config || {}) as RetryConfig;
    const status = error.response?.status;
    const url = originalRequest.url || "";

    if (status === 401 && !originalRequest._retry && !url.includes("/auth/login") && !url.includes("/auth/refresh")) {
      originalRequest._retry = true;
      if (!refreshPromise) {
        refreshPromise = client.post("/auth/refresh", {}).finally(() => {
          refreshPromise = null;
        });
      }
      try {
        await refreshPromise;
        return client(originalRequest);
      } catch (refreshError) {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
