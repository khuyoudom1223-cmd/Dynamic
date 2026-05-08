import app from "./index.js";
import { expressToWorker } from "express-to-worker";

export default {
  async fetch(request, env, context) {
    for (const [key, value] of Object.entries(env)) {
      if (typeof value === "string") {
        process.env[key] = value;
      }
    }

    process.env.CLOUDFLARE = "true";
    process.env.CF_PAGES = "true";

    return expressToWorker(app)(request, env, context);
  }
};