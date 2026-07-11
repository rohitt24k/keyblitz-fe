import axios from "axios";
import type { AxiosInstance, AxiosResponse } from "axios";
import { queryClient } from "@/utils/queryClient";
import { storedTokens } from "@/utils/storedTokens";
import type { T_Api_Success_Res } from "./api.types";

export const API_URL = "";

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 3 * 60 * 1000,
});

function refresh() {
  return new Promise((resolve, reject) => {
    api
      .post("/auth/refresh-token", {
        refreshToken: storedTokens.refreshToken.getToken(),
      })
      .then((res) => {
        const data = res.data as T_Api_Success_Res<{ accessToken: string }>;
        storedTokens.accessToken.setToken(data.result.accessToken);
        return resolve(data.result.accessToken);
      })
      .catch(async (error) => {
        storedTokens.accessToken.removeToken();
        storedTokens.refreshToken.removeToken();
        window.location.replace("/");
        queryClient.clear();
        return reject(error.response?.data?.message);
        // try {
        //   return await api.get("/auth/logout", authHeader());
        // } catch (err) {
        //   return reject(error);
        // }
      });
  });
}
api.interceptors.request.use(
  (config) => {
    const token = storedTokens.accessToken.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
api.interceptors.response.use(
  (res: AxiosResponse) => {
    return res;
  },
  async (err) => {
    const originalRequest = err.config;
    if (
      err.response?.status === 401 &&
      err.response.data.message === "Unauthorized" &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      const token = await refresh();
      err.config.headers.Authorization = `Bearer ${token}`;

      return await api(originalRequest);
    } else {
      return Promise.reject(err);
    }
  },
);

export { api };

export const API_ROUTES = {
  ORGANIZATION_MEMBERS: "/organization/members/all",
  ORGANIZATION_MEMBERS_ANALYTICS: "/organization/analytics/user",
  PIPELINES: "/pipeline",
  PIPELINE: (id: string) => `/pipeline/${id}`,
  PIPELINE_ASSIGN: "/pipeline/assign-stage-to-user",
  PIPELINE_UNASSIGN: "/pipeline/unassign-stage-from-user",
  JOB_POSTS: "/job-post",
  JOB_POST: (id: string) => `/job-post/${id}`,
  JOB_POST_STATUS: (id: string) => `/job-post/${id}/status`,

  ORGANIZATION_BY_ID: (id: string) => `/organization/${id}`,
};

export const formKeys = {
  all: ["forms"] as const,

  lists: () => [...formKeys.all, "list"] as const,
  list: (filters?: unknown) => [...formKeys.lists(), filters] as const,

  details: () => [...formKeys.all, "detail"] as const,
  detail: (id: string) => [...formKeys.details(), id] as const,

  public: () => [...formKeys.all, "public"] as const,
  publicBySlug: (slug: string) => [...formKeys.public(), slug] as const,
};
