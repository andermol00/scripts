// Configuracion plana (flat config) minima y sin dependencias extra.
// Si quieres las reglas completas de Next instala eslint-config-next y usa
// FlatCompat para extender "next/core-web-vitals".
export default [
  {
    ignores: ["node_modules/**", ".next/**", "dist/**", "coverage/**"],
  },
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    rules: {
      "no-console": "off",
      eqeqeq: ["warn", "smart"],
    },
  },
];
