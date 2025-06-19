import { test, expect } from '@playwright/test';

test.describe('健康管理アプリ', () => {
  test.beforeEach(async ({ page }) => {
    // アプリのトップページに移動
    await page.goto('/');
  });

  test('トップページが正常に表示される', async ({ page }) => {
    // ページタイトルの確認
    await expect(page).toHaveTitle(/Vite \+ React \+ TS/);

    // ナビゲーションメニューの確認
    await expect(page.locator('text=記録入力')).toBeVisible();
    await expect(page.locator('text=記録一覧')).toBeVisible();
    await expect(page.locator('text=記録グラフ')).toBeVisible();
    await expect(page.locator('text=記録カレンダー')).toBeVisible();
    await expect(page.locator('text=エクスポート')).toBeVisible();
  });

    test('記録入力画面での基本操作', async ({ page }) => {
    // 記録入力画面にいることを確認（日時選択セクションで判定）
    await expect(page.locator('label', { hasText: '📅 記録日時' })).toBeVisible();

    // 備考入力テスト
    const notesTextarea = page.locator('textarea[placeholder*="その時の体調"]');
    await expect(notesTextarea).toBeVisible();
    await notesTextarea.fill('テスト記録です');

    // 健康項目への入力（実際のフィールドIDベースで特定）
    // 体重入力（最初の数値入力フィールドを使用）
    const numberInputs = page.locator('input[type="number"]');
    await expect(numberInputs.first()).toBeVisible();
    await numberInputs.first().fill('65.5');

    // 2番目の数値フィールド（収縮期血圧と想定）
    await numberInputs.nth(1).fill('120');

    // 3番目の数値フィールド（拡張期血圧と想定）
    await numberInputs.nth(2).fill('80');

    // チェックボックス（運動有無など）をチェック
    const checkboxes = page.locator('input[type="checkbox"]');
    if (await checkboxes.count() > 0) {
      await checkboxes.first().check();
    }

    // 保存ボタンをクリック
    const saveButton = page.locator('button', { hasText: '📝 記録する' });
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // 保存完了の確認（トーストメッセージの表示を待つ）
    await expect(page.locator('text=記録を保存いたしましたわ')).toBeVisible({ timeout: 3000 });

    // トーストメッセージが消えるまで待つ
    await page.waitForTimeout(1000);
  });

    test('記録一覧画面の表示確認', async ({ page }) => {
    // 記録一覧画面に移動
    await page.locator('text=記録一覧').click();
    await expect(page.url()).toContain('/list');

    // 記録一覧のタイトル確認
    await expect(page.locator('h2', { hasText: '記録一覧' })).toBeVisible();
  });

  test('記録グラフ画面の表示確認', async ({ page }) => {
    // 記録グラフ画面に移動
    await page.locator('text=記録グラフ').click();
    await expect(page.url()).toContain('/graph');

    // グラフページのタイトル確認
    await expect(page.locator('h2', { hasText: '記録グラフ' })).toBeVisible();

    // グラフ設定の選択フィールド確認
    await expect(page.locator('select').first()).toBeVisible(); // 項目選択
  });

  test('記録カレンダー画面の表示確認', async ({ page }) => {
    // 記録カレンダー画面に移動
    await page.locator('text=記録カレンダー').click();
    await expect(page.url()).toContain('/calendar');

    // カレンダーページのタイトル確認
    await expect(page.locator('h2', { hasText: '記録カレンダー' })).toBeVisible();

    // カレンダーコンポーネントの存在確認
    await expect(page.locator('.react-calendar')).toBeVisible();
  });

  test('エクスポート画面の表示確認', async ({ page }) => {
    // エクスポート画面に移動
    await page.locator('text=エクスポート').click();
    await expect(page.url()).toContain('/export');

    // エクスポートページのタイトル確認
    await expect(page.locator('h2', { hasText: 'エクスポート' })).toBeVisible();

    // エクスポートボタンの存在確認
    await expect(page.locator('button', { hasText: 'JSON形式でダウンロード' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'CSV形式でダウンロード' })).toBeVisible();
  });

  test('ナビゲーション動作の確認', async ({ page }) => {
    // 各ページへのナビゲーションテスト
    const navItems = [
      { text: '記録一覧', url: '/list' },
      { text: '記録グラフ', url: '/graph' },
      { text: '記録カレンダー', url: '/calendar' },
      { text: 'エクスポート', url: '/export' },
      { text: '記録入力', url: '/' },
    ];

    for (const nav of navItems) {
      await page.locator(`text=${nav.text}`).click();
      await expect(page.url()).toContain(nav.url);
      await page.waitForTimeout(500); // ページ遷移を待つ
    }
  });
});
