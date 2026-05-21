import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  withCredentials: true,
});

let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err);
    }
    original._retry = true;

    if (!refreshing) {
      refreshing = api.post("/auth/refresh").finally(() => { refreshing = null; });
    }

    try {
      const { data } = await refreshing;
      localStorage.setItem("token", data.access_token);
      original.headers["Authorization"] = `Bearer ${data.access_token}`;
      return api(original);
    } catch {
      localStorage.removeItem("token");
      window.location.href = "/login";
      return Promise.reject(err);
    }
  }
);

export default api;
