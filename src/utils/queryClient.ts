import { MutationCache, QueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "./functions";
import type { T_Api_Success_Res } from "@/api/api.types";
import { toast } from "sonner";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },

  mutationCache: new MutationCache({
    onSuccess: (data) => {
      toast.success((data as T_Api_Success_Res<unknown>).message);
    },
    onError: (error) => {
      const routeList = ["/auth/login"];
      if (
        error.response?.data?.result?.message !== "Expired or Invalid Token"
      ) {
        if (error?.config?.url && !routeList.includes(error?.config?.url)) {
          toast.error(getErrorMessage(error));
        }
      }
    },
  }),
});
