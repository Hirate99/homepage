import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  globalIgnores([
    '**/.next/**',
    '**/.open-next/**',
    '**/.wrangler/**',
    '.cf-worker-deploy/**',
    'cloudflare-env.d.ts',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
