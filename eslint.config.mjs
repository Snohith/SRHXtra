import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**", "**/.turbo/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Node globals for build config files (.mjs) — the TS config only covers TS,
  // so `process`/`URL` in next.config.mjs would otherwise trip `no-undef`.
  {
    files: ["**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        fetch: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
  },
);
