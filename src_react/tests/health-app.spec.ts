import { expect, test } from '@playwright/test';

test.describe('健康管理アプリ', () => {
  test.beforeEach(async ({ page }) => {
    // TIPS自動表示を無効化
    await page.addInitScript(() => {
      localStorage.setItem('i18nextLng', 'ja');
      localStorage.setItem('disableTips', '1');
    });

    // アプリのトップページに移動
    await page.goto('/');

    // TIPSモーダルが表示されていれば外側クリックで閉じる（最大3回リトライ）
    for (let i = 0; i < 3; i++) {
      const tipsModal = page.locator('h2', { hasText: '本日のTIPS' });
      if (await tipsModal.isVisible({ timeout: 1000 }).catch(() => false)) {
        await page.mouse.click(10, 10);
        await page.waitForTimeout(300);
      } else {
        break;
      }
    }

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

  // オーバーレイ（モバイルメニューやTips等）が消えるまで待つヘルパー
  async function waitForOverlayToDisappear(page) {
    // aria-hidden="true"のdivが消えるまで最大2秒待つ
    await page
      .waitForSelector('div[aria-hidden="true"]', {
        state: 'detached',
        timeout: 2000,
      })
      .catch(() => {});
  }

  test('トップページが正常に表示される', async ({ page }) => {
    await waitForOverlayToDisappear(page);
    // main要素の存在確認（アプリ読み込み確認）
    await expect(page.getByRole('main')).toBeVisible({ timeout: 10000 });
  });

  test('記録入力画面での基本操作', async ({ page }) => {
    await waitForOverlayToDisappear(page);
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
    await waitForOverlayToDisappear(page);
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
    await waitForOverlayToDisappear(page);
    // モバイルナビゲーションに対応
    await ensureNavigationVisible(page);
    // 記録一覧画面に移動
    const nav = page.getByRole('navigation');
    await nav
      .getByRole('link', { name: '体重', exact: true })
      .filter({ hasText: '体重', visible: true })
      .first()
      .click();
    await waitForOverlayToDisappear(page);
    await page.waitForTimeout(500);
    await expect(page.url()).toContain('/list');
    // 記録一覧のリスト要素が表示されていることを確認
    await expect(
      page.locator('[data-testid="record-list"], .record-list')
    ).toBeVisible();
  });

  test('記録グラフ画面の表示確認', async ({ page }) => {
    await waitForOverlayToDisappear(page);
    // モバイルナビゲーションに対応
    await ensureNavigationVisible(page);
    // 記録グラフ画面に移動
    const nav = page.getByRole('navigation');
    await nav
      .getByRole('link', { name: 'グラフ', exact: true })
      .filter({ hasText: 'グラフ', visible: true })
      .first()
      .click();
    await waitForOverlayToDisappear(page);
    await page.waitForTimeout(500);
    await expect(page.url()).toContain('/graph');
    // グラフ設定の選択フィールド確認
    const comboboxes = page.getByRole('combobox');
    if ((await comboboxes.count()) > 0) {
      await expect(comboboxes.first()).toBeVisible();
    }
    // グラフSVGが表示されていることを確認
    await expect(page.locator('svg')).toBeVisible();
  });

  test('記録カレンダー画面の表示確認', async ({ page }) => {
    await waitForOverlayToDisappear(page);
    // モバイルナビゲーションに対応
    await ensureNavigationVisible(page);
    // 記録カレンダー画面に移動
    const nav = page.getByRole('navigation');
    await nav
      .getByRole('link', { name: '体重', exact: true })
      .filter({ hasText: '体重', visible: true })
      .first()
      .click();
    await waitForOverlayToDisappear(page);
    await page.waitForTimeout(500);
    await expect(page.url()).toContain('/calendar');
    // カレンダーコンポーネントの存在確認
    await expect(page.locator('.react-calendar')).toBeVisible();
  });

  test('エクスポート画面の表示確認', async ({ page }) => {
    await waitForOverlayToDisappear(page);
    // モバイルナビゲーションに対応
    await ensureNavigationVisible(page);
    // エクスポート画面に移動
    const nav = page.getByRole('navigation');
    await nav
      .getByRole('link', { name: '管理', exact: true })
      .filter({ hasText: '管理', visible: true })
      .first()
      .click();
    await waitForOverlayToDisappear(page);
    await page.waitForTimeout(500);
    await expect(page.url()).toContain('/export');
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

    for (const navItem of navItems) {
      await ensureNavigationVisible(page);
      const nav = page.getByRole('navigation');
      await waitForOverlayToDisappear(page);
      await nav
        .getByRole('link', { name: navItem.name, exact: true })
        .filter({ hasText: navItem.name, visible: true })
        .first()
        .click();
      await waitForOverlayToDisappear(page);
      await page.waitForTimeout(500);
      await expect(page.url()).toContain(navItem.url);
    }
  });
});
