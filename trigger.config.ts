import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID ?? "muster-local",
  dirs: ["./apps/web/src/trigger"]
});
