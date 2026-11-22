/** Error bodies always have this shape; the client turns the code into a French message. */
export type ApiError = {
  error: 'not_found';
};

export type HealthResponse = {
  status: 'ok';
  version: string;
};
