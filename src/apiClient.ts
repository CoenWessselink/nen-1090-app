import axios from "axios";

const apiClient = axios.create({
  baseURL: "/api/v1",
  timeout: 8000,
  withCredentials: true
});

export default apiClient;