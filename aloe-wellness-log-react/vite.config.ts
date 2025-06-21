import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // バンドル分析用プラグイン（production buildでのみ有効）
    visualizer({
      filename: 'dist/bundle-analysis.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],

  // パフォーマンス最適化設定
  build: {
    // チャンクサイズの制限を調整
    chunkSizeWarningLimit: 600,

    // Rollupの最適化オプション
    rollupOptions: {
      // Code splitting設定
      output: {
        manualChunks: {
          // React関連を別チャンクに分離
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // UI/Chart関連を別チャンクに分離
          'ui-vendor': ['recharts', 'react-calendar', '@headlessui/react'],

          // DnD関連を別チャンクに分離
          'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/sortable'],

          // Icons関連を別チャンクに分離
          'icons-vendor': ['react-icons'],

          // State management関連を別チャンクに分離
          'state-vendor': ['zustand'],
        },
      },
    },

    // 最適化オプション
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // console.logを本番環境で削除
        drop_debugger: true,
      },
    },

    // ソースマップの設定（本番環境では無効化）
    sourcemap: false,

    // CSSの最適化
    cssMinify: true,
  },

  // 依存関係の事前バンドル最適化
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      'recharts',
      'react-calendar',
      '@headlessui/react',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      'react-icons',
    ],
  },

  // 開発サーバーの設定
  server: {
    // HMRの最適化
    hmr: {
      overlay: true,
    },
  },

  // プレビューサーバーの設定
  preview: {
    port: 4173,
    host: true,
  },
});
