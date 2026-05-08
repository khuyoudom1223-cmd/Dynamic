import app from "../index.js";
import { expressToWorker } from "express-to-worker";

export const onRequest = async (context) => {
  const { request, env } = context;

  // Sync Cloudflare environment variables to process.env for Node.js compatibility
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") {
      process.env[key] = value;
    }
  }

  // Ensure Cloudflare environment is detected
  process.env.CLOUDFLARE = "true";
  process.env.CF_PAGES = "true";

  // Use the bridge to handle the request
  return expressToWorker(app)(request, env, context);
};
