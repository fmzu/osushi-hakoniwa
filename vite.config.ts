import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  // 本編(index.html)と追加章すしづめ(sushizume.html)の2ページ構成
  build: {
    rollupOptions: {
      input: { main: "index.html", sushizume: "sushizume.html" },
    },
  },
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  test: {
    environment: "jsdom",
    globals: false,
  },
});
