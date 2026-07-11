import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from ".";
import type { T_Api_Success_Res } from "./api.types";
import { storedTokens } from "@/utils/storedTokens";
import type { User } from "@/types/user.types";

export const userService = {
  useLogin: () => {
    return useMutation({
      mutationKey: ["login"],
      mutationFn: async (body: { email: string; password: string }) => {
        const res = await api.post(`auth/login`, body);
        const data = res.data as T_Api_Success_Res<{
          accessToken: string;
          refreshToken: string;
        }>;

        storedTokens.accessToken.setToken(data.result.accessToken);
        storedTokens.refreshToken.setToken(data.result.refreshToken);
      },
    });
  },
  useGetMe: () => {
    return useQuery({
      queryKey: ["user", "me"],
      queryFn: async () => {
        const res = await api.get("/user/me");
        const data = res.data as T_Api_Success_Res<{ user: User }>;
        return data.result.user;
      },
      enabled: !!storedTokens.accessToken.getToken(),
      staleTime: 5 * 60 * 1000,
    });
  },
  useRegister: () => {
    return useMutation({
      mutationKey: ["register"],
      mutationFn: async (body: { email: string; password: string }) => {
        return await api.post(`/user/register`, body);
      },
    });
  },
};
