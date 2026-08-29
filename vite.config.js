import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // eslint-disable-next-line no-undef
  const env = loadEnv(mode, process.cwd());

  const serverConfig =
    env.VITE_ENABLE_LOCAL_DNS === "true"
      ? {
        host: "private-pay.test",
        port: 5173,
        hmr: {
          host: "private-pay.test",
          protocol: "ws",
        },
      }
      : {
        strictPort: false,
      };

  return {
    base: '/', // Explicit base path for Vercel
    plugins: [
      react(),
      svgr(),
      nodePolyfills({
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        protocolImports: true,
      }),
      // Fix @wagmi/connectors optional-dep stub chunk that emits invalid syntax (Expected ";" but found "export")
      {
        name: 'fix-wagmi-connectors-chunk',
        renderChunk(code, chunk) {
          if (chunk.fileName && chunk.fileName.includes('connectors_false')) {
            return code.replace(/\)export\s*\{/g, ');\nexport {');
          }
          return null;
        },
      },
      // Plugin to fix WebAssembly MIME type for CoFHE
      {
        name: 'configure-response-headers',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // Fix WASM MIME type for all WASM files (including in node_modules/.vite/deps/)
            if (req.url.endsWith('.wasm') || req.url.includes('.wasm')) {
              res.setHeader('Content-Type', 'application/wasm');
              res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
              res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
            }
            next();
          });
        },
      },
    ],
    server: {
      ...serverConfig,
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
    // Enable WebAssembly and top-level await support for Zcash shielded transactions
    optimizeDeps: {
      include: [
        "readable-stream",
        "buffer",
        "osmojs",
        "@cosmjs/amino",
        "@cosmjs/proto-signing",
        "@cosmjs/stargate",
        "wagmi",
        "connectkit",
        "@wagmi/connectors",
        "util",
        "fast-text-encoding",
        "stream-http",
        "https-browserify",
        "os-browserify",
        "url"
      ],
      esbuildOptions: {
        define: {
          global: "globalThis",
        },
        target: 'es2020',
        // Reduce memory usage during dependency optimization
        logLimit: 0,
      },
      // Exclude heavy packages that cause memory issues
      exclude: [
        '@chainsafe/webzjs-wallet', 
        '@chainsafe/webzjs-keys', 
        'cofhejs', 
        '@provablehq/sdk', 
        '@provablehq/wasm',
        'o1js', // Large package, optimize separately if needed
      ],
      // Force optimization to reduce runtime memory
      force: false,
    },
    worker: {
      format: 'es',
    },
    define: {
      "process.env": {},
      global: "globalThis",
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // Override nested readable-stream in ripemd160/hash-base
        "readable-stream": "readable-stream",
        // Ensure single React instance to fix useContext null errors
        "react": path.resolve(__dirname, "./node_modules/react"),
        "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
        "http": "stream-http",
        "https": "https-browserify",
        "os": "os-browserify",
        "url": "url",
        "vm": "vm-browserify",
      },
      // Dedupe React to prevent multiple instances
      dedupe: ['react', 'react-dom'],
    },
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 2000,
      minify: 'esbuild', // Use esbuild for faster, lower-memory minification
      commonjsOptions: {
        transformMixedEsModules: true,
        include: [/node_modules/],
      },
      rollupOptions: {
        plugins: [],
        output: {
          // Let Vite handle chunking automatically to avoid circular dependencies
          // and execution order issues (like "id is not a function").
          manualChunks: undefined,
          // Optimize chunk sizes to reduce memory usage
          compact: true,
        },
        // Reduce memory usage during build
        maxParallelFileOps: 1, // Process files sequentially to reduce memory
      },
    },
  };
});
