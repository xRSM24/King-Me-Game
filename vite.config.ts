import { defineConfig } from "vite";
import { accountPlugin } from "./account-plugin.ts";
import { dailyLeaderboardPlugin } from "./daily-plugin.ts";

export default defineConfig({
  base: "./",
  plugins: [dailyLeaderboardPlugin(), accountPlugin()],
  server: {
    host: "0.0.0.0",
    port: 43181,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 43181,
    strictPort: true,
  },
});
