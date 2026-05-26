import { auth } from "@muster/adapter-auth-betterauth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
