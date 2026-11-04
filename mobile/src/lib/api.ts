/** The backend exists for one thing: the OAuth code exchange, which needs the
 *  app secret. Everything else the app asks Instagram for directly. */
export const API_URL = process.env.EXPO_PUBLIC_API_URL || "";
