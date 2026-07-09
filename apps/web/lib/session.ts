import { headers } from "next/headers";
import { auth } from "./auth";

/** Server-side session lookup for server components and route handlers. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}
