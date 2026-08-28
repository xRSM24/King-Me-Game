import { defineConfig } from "vite";
import { dailyLeaderboardPlugin } from "./daily-plugin.ts";

export default defineConfig({
  base: "./",
  plugins: [dailyLeaderboardPlugin()],
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
