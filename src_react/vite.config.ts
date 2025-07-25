// cspell:words headlessui terser brotli
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import fs from 'fs';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

// Service Worker自動更新プラグイン
function swAutoUpdate(basePath: string) {
  return {
    name: 'sw-auto-update',
    generateBundle(
      _options: unknown,
      bundle: Record<string, { fileName: string; type: string }>
    ) {
      // ビルド後のファイル名を取得
      const extra = [`${basePath}manifest.json`, `${basePath}aloe-icon.png`];
      const jsFiles = Object.keys(bundle).filter(key => key.endsWith('.js'));
      const cssFiles = Object.keys(bundle).filter(key => key.endsWith('.css'));

      // Service Workerファイルを更新
      const swPath = path.resolve('public/sw.js');
      if (fs.existsSync(swPath)) {
        let swContent = fs.readFileSync(swPath, 'utf-8');

        // ビルドファイルリストを動的に更新
        const buildFiles = [
          ...extra,
          ...jsFiles.map(file => `${basePath}assets/${file}`),
          ...cssFiles.map(file => `${basePath}assets/${file}`),
        ];

        // バージョンを更新（現在の日時ベース）
        const version = new Date()
          .toISOString()
          .slice(0, 19)
          .replace(/:/g, '-');

        swContent = swContent.replace(
          /const CACHE_NAME = '[^']*';/,
          `const CACHE_NAME = 'aloe-wellness-v${version}';`
        );
        swContent = swContent.replace(
          /const STATIC_CACHE_NAME = '[^']*';/,
          `const STATIC_CACHE_NAME = 'aloe-wellness-static-v${version}';`
        );

        // base pathを自動埋め込み
        swContent = swContent.replace(
          /const BASE_PATH = '.*?';/, // 既存またはダミーのBASE_PATH行
          `const BASE_PATH = '${basePath}';`
        );

        // ビルドファイルを追加
        const buildFileList = buildFiles.map(file => `  '${file}'`).join(',\n');
        swContent = swContent.replace(
          /\/\/ \/assets\/index-\*\.css[\s\S]*?\/\/ \/assets\/index-\*\.js/,
          buildFileList
        );

        fs.writeFileSync(path.resolve('dist/sw.js'), swContent);
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => {
  const isProduction = mode === 'production';

  // GitHub Pages用のベースパス設定
  const base =
    isProduction && command === 'build' ? '/aloe-wellness-log/' : '/';

  const plugins = [
    react(),
    tailwindcss(),
    // バンドル分析用プラグイン（production buildでのみ有効）
    ...(isProduction && process.env.ANALYZE_BUNDLE
      ? [
          visualizer({
            filename: 'dist/bundle-analysis.html',
            open: true,
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
    // Service Worker自動更新
    ...(isProduction ? [swAutoUpdate(base)] : []),
  ];

  return {
    plugins,
    base,

    // パフォーマンス最適化設定
    build: {
      // GitHub Pages (docs フォルダ) 用の出力設定
      outDir: '../docs',
      emptyOutDir: true,
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
            'state-vendor': ['mobx', 'mobx-react-lite'],
          },
        },
      },

      // 最適化オプション
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction
        ? {
            compress: {
              drop_console: true,
              drop_debugger: true,
            },
            mangle: {
              safari10: true, // Safari 10対応
            },
          }
        : undefined,

      // ソースマップの設定（開発環境では有効、本番環境では無効化）
      // sourcemap: true,
      sourcemap: !isProduction,

      // CSSの最適化
      // cssMinify: false,
      cssMinify: isProduction,
    },

    // 依存関係の事前バンドル最適化
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'mobx',
        'mobx-react-lite',
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
      headers: {
        'Cache-Control': 'no-store',
      },
    },

    // プレビューサーバーの設定
    preview: {
      port: 4173,
      host: true,
    },
  };
});
