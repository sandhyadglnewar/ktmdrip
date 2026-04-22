import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    {
      ...cloudflare({ viteEnvironment: { name: "ssr" } }),
      apply: "build",
    } as any,
  ],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    watch: {
      ignored: ["**/node_modules/**", "**/.git/**"],
    },
  },
});
