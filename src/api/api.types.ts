export type T_Api_Success_Res<T> = {
  message: string;
  result: T;
  status: "success";
  statusCode: 200 | 201;
};

export type T_Api_Error_Res = {
  message: string;
  result: { message?: string; error?: unknown };
  status: "error";
  statusCode: 400 | 401 | 403 | 404 | 500;
};

export type T_Api_Paginated<T> = {
  data: T[];
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: null | number;
  prevPage: null | number;
  limit: number;
  page: number;
  totalObjects: number;
  totalPages: number;
};
