import { T_Api_Error_Res } from "@/api/api.types";
import { AxiosError } from "axios";

export function getErrorMessage<T extends AxiosError<T_Api_Error_Res>>(
  error: T | unknown,
) {
  if (error instanceof AxiosError) {
    const err = error as T;
    console.log({ mes: err?.response?.data?.result?.message });
    console.log({ message: err?.response?.data?.message });
    return (
      err?.response?.data?.result?.message ??
      (typeof err?.response?.data?.result?.error === "string"
        ? err?.response?.data?.result?.error
        : undefined) ??
      err?.response?.data?.message ??
      err?.message
    );
  } else if (error instanceof Error) {
    return error?.message;
  } else return String(error);
}
