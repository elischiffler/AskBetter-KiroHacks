/// <reference types="vitest/config" />
import { defineConfig, mergeConfig } from 'vite';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: false,
      environment: 'node',
      passWithNoTests: true,
    },
  }),
);
