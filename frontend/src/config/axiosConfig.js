import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5002";

axios.defaults.baseURL = API_BASE_URL;

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  if (typeof config.url === "string" && config.url.startsWith(API_BASE_URL)) {
    config.url = config.url.replace(API_BASE_URL, "");
  }

  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if ((status === 401 || status === 403) && window.location.pathname !== "/") {
      localStorage.removeItem("token");
      localStorage.removeItem("employeeToken");
      localStorage.removeItem("adminData");
      localStorage.removeItem("employeeUser");
      localStorage.removeItem("userPermissions");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);
