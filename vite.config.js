import { defineConfig } from 'vite';

// Relative assets also work when a static host serves the app from a subpath.
export default defineConfig({ base: './', server: { allowedHosts: ['terminal.local'] } });
