import { defineConfig } from "@playwright/test";

export default defineConfig({
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  retries: 1,
  workers: 1,
});
