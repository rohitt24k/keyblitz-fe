import type { T_Api_Error_Res } from "@/api/api.types";
import type { AxiosError } from "axios";

declare module "@tanstack/react-query" {
  interface Register {
    defaultError: AxiosError<T_Api_Error_Res>;
  }
}
