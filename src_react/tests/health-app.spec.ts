import { expect, test } from '@playwright/test';

test.describe('健康管理アプリ', () => {
  test.beforeEach(async ({ page }) => {
    // 言語設定を日本語に固定（LocalStorageに保存）
    await page.addInitScript(() => {
      localStorage.setItem('i18nextLng', 'ja');
    });

    // アプリのトップページに移動
    await page.goto('/');

    // 言語設定とアプリの完全読み込みを待機（WebKit対応）
    await page.waitForTimeout(2000);

    // main要素の存在確認（アプリ読み込み確認）
    await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
  });

  // モバイルナビゲーション用のヘルパー関数
  async function ensureNavigationVisible(page: any) {
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      // モバイルビューの場合、メニューボタンをクリック
      const menuButton = page.getByRole('button', { name: 'メニューを開く' });
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(300); // メニューアニメーション待ち
      }
    }
  }

  test('トップページが正常に表示される', async ({ page }) => {
    // ページタイトルの確認
    await expect(page).toHaveTitle('アロエ健康管理ログ');

    // モバイルナビゲーションに対応
    await ensureNavigationVisible(page);

    // ナビゲーションメニューの確認（aria-labelで一意に特定）
    await expect(page.getByRole('link', { name: '血圧に移動' })).toBeVisible();
    await expect(page.getByRole('link', { name: '体重に移動' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'グラフに移動' })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: '体重に移動' })).toBeVisible();
    await expect(page.getByRole('link', { name: '管理に移動' })).toBeVisible();
  });

  test('記録入力画面での基本操作', async ({ page }) => {
    // 記録入力画面のページタイトル確認（名前で特定してモバイルヘッダーを除外）
    await expect(
      page.getByRole('heading', { level: 1, name: '記録入力' })
    ).toBeVisible();

    // 備考入力テスト（placeholder で特定）
    const notesTextarea = page.locator(
      'textarea[placeholder*="体調や気になったこと"]'
    );
    await expect(notesTextarea).toBeVisible();
    await notesTextarea.fill('テスト記録です');

    // 健康項目への入力（数値入力フィールド）
    const numberInputs = page.getByRole('spinbutton');
    if ((await numberInputs.count()) > 0) {
      await numberInputs.first().fill('65.5');
      if ((await numberInputs.count()) > 1) {
        await numberInputs.nth(1).fill('120');
      }
      if ((await numberInputs.count()) > 2) {
        await numberInputs.nth(2).fill('80');
      }
    }

    // 保存ボタンをクリック
    const saveButton = page.getByRole('button', { name: '記録する' });
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // 保存完了の確認（成功トーストメッセージを特定）
    await expect(
      page.locator('[role="status"]', { hasText: '記録を保存しました' })
    ).toBeVisible({
      timeout: 3000,
    });

    // トーストメッセージが消えるまで待つ
    await page.waitForTimeout(1000);
  });

  test('記録入力画面で除外ボタンを押してもエラーが発生しない', async ({
    page,
  }) => {
    // 記録入力画面のページタイトル確認
    await expect(
      page.getByRole('heading', { level: 1, name: '記録入力' })
    ).toBeVisible();

    // 除外ボタンを取得（最初の項目でテスト）
    const excludeButton = page.getByRole('button', { name: '除外' }).first();
    await expect(excludeButton).toBeVisible();

    // 除外ボタンをクリック
    await excludeButton.click();

    // エラーやクラッシュが発生していないことを確認（main要素が表示されている）
    await expect(page.getByRole('main')).toBeVisible();

    // 追加で、エラートーストやErrorBoundaryの表示がないことも確認（任意）
    await expect(
      page
        .locator('[role="alert"], [role="status"]')
        .filter({ hasText: /エラー|error|Exception/i })
    ).toHaveCount(0);
  });

  test('記録一覧画面の表示確認', async ({ page }) => {
    // モバイルナビゲーションに対応
    await ensureNavigationVisible(page);

    // 記録一覧画面に移動
    await page.getByRole('link', { name: '体重に移動' }).click();
    await expect(page.url()).toContain('/list');

    // 記録一覧のページタイトル確認（h1で確認）
    await expect(
      page.getByRole('heading', { level: 1, name: '一覧' })
    ).toBeVisible();
  });

  test('記録グラフ画面の表示確認', async ({ page }) => {
    // モバイルナビゲーションに対応
    await ensureNavigationVisible(page);

    // 記録グラフ画面に移動
    await page.getByRole('link', { name: 'グラフに移動' }).click();
    await expect(page.url()).toContain('/graph');

    // グラフページのタイトル確認（h1で確認）
    await expect(
      page.getByRole('heading', { level: 1, name: 'グラフ' })
    ).toBeVisible();

    // グラフ設定の選択フィールド確認
    const comboboxes = page.getByRole('combobox');
    if ((await comboboxes.count()) > 0) {
      await expect(comboboxes.first()).toBeVisible();
    }
  });

  test('記録カレンダー画面の表示確認', async ({ page }) => {
    // モバイルナビゲーションに対応
    await ensureNavigationVisible(page);

    // 記録カレンダー画面に移動
    await page.getByRole('link', { name: '体重に移動' }).click();
    await expect(page.url()).toContain('/calendar');

    // カレンダーページのタイトル確認（h1で確認）
    await expect(
      page.getByRole('heading', { level: 1, name: 'カレンダー' })
    ).toBeVisible();

    // カレンダーコンポーネントの存在確認
    await expect(page.locator('.react-calendar')).toBeVisible();
  });

  test('エクスポート画面の表示確認', async ({ page }) => {
    // モバイルナビゲーションに対応
    await ensureNavigationVisible(page);

    // エクスポート画面に移動
    await page.getByRole('link', { name: '管理に移動' }).click();
    await expect(page.url()).toContain('/export');

    // エクスポートページのタイトル確認（h1で確認）
    await expect(
      page.getByRole('heading', { level: 1, name: '管理' })
    ).toBeVisible();

    // エクスポートボタンの存在確認
    await expect(
      page.getByRole('button', { name: 'JSONファイルをダウンロード' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'CSVファイルをダウンロード' })
    ).toBeVisible();
  });

  test('ナビゲーション動作の確認', async ({ page }) => {
    // 各ページへのナビゲーションテスト
    const navItems = [
      { name: '日課', url: '/daily' },
      { name: '体重', url: '/weight' },
      { name: '血圧', url: '/bp' },
      { name: 'グラフ', url: '/graph' },
      { name: '管理', url: '/export' },
    ];

    for (const nav of navItems) {
      // モバイルナビゲーションに対応
      await ensureNavigationVisible(page);

      await page.getByRole('link', { name: nav.name }).click();
      await expect(page.url()).toContain(nav.url);
      await page.waitForTimeout(500); // ページ遷移を待つ
    }
  });
});
