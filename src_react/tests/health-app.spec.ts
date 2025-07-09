import { expect, test } from '@playwright/test';

// オーバーレイ（Tips等）が消えるまで待つヘルパー
async function waitForOverlayToDisappear(page) {
  await page
    .waitForSelector('div[aria-hidden="true"]', {
      state: 'detached',
      timeout: 2000,
    })
    .catch(() => {});
}

test.describe('健康管理アプリ現行画面 E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('i18nextLng', 'ja');
      localStorage.setItem('disableTips', '1');
    });
    await page.reload();
    await waitForOverlayToDisappear(page);
    await page.waitForSelector('main', { state: 'attached', timeout: 10000 });
    await expect(page.getByTestId('page-loader')).toBeHidden();
  });

  test('体重記録画面の主要UIが表示される', async ({ page }) => {
    await page.goto('/weight');
    await waitForOverlayToDisappear(page);
    // fieldsが空の場合は項目追加
    if (
      !(await page
        .getByTestId('weight-input')
        .isVisible()
        .catch(() => false))
    ) {
      // 「項目追加」ボタンがあればクリックし、ダイアログで項目名を入力して保存
      if (
        await page
          .getByTestId('add-btn')
          .isVisible()
          .catch(() => false)
      ) {
        await page.getByTestId('add-btn').click();
        await page.getByTestId('daily-input-2').fill('体重');
        await page.getByTestId('save-btn').click();
      }
    }
    await expect(page.getByTestId('date-picker')).toBeVisible();
    await expect(page.getByTestId('weight-input')).toBeVisible();
    await expect(page.getByTestId('save-btn')).toBeVisible();
  });

  test('日課記録画面の主要UIが表示される', async ({ page }) => {
    await page.goto('/daily');
    await waitForOverlayToDisappear(page);
    // fieldsが空の場合は項目追加
    if (
      !(await page
        .getByTestId('daily-input-1')
        .isVisible()
        .catch(() => false))
    ) {
      if (
        await page
          .getByTestId('add-btn')
          .isVisible()
          .catch(() => false)
      ) {
        await page.getByTestId('add-btn').click();
        await page.getByTestId('daily-input-2').fill('早歩き');
        await page.getByTestId('save-btn').click();
      }
    }
    await expect(page.getByTestId('date-picker')).toBeVisible();
    await expect(page.getByTestId('daily-input-1')).toBeVisible();
    await expect(page.getByTestId('save-btn')).toBeVisible();
  });

  test('血圧記録画面の主要UIが表示される', async ({ page }) => {
    await page.goto('/bp');
    await waitForOverlayToDisappear(page);
    // fieldsが空の場合は項目追加
    if (
      !(await page
        .getByTestId('systolic-input')
        .isVisible()
        .catch(() => false))
    ) {
      if (
        await page
          .getByTestId('add-btn')
          .isVisible()
          .catch(() => false)
      ) {
        await page.getByTestId('add-btn').click();
        await page.getByTestId('daily-input-2').fill('最高血圧');
        await page.getByTestId('save-btn').click();
      }
    }
    await expect(page.getByTestId('date-picker')).toBeVisible();
    await expect(page.getByTestId('systolic-input')).toBeVisible();
    await expect(page.getByTestId('diastolic-input')).toBeVisible();
    await expect(page.getByTestId('save-btn')).toBeVisible();
  });

  test('グラフ画面の主要UIが表示される', async ({ page }) => {
    await page.goto('/graph');
    await waitForOverlayToDisappear(page);
    await expect(page.getByTestId('record-graph')).toBeVisible();
    await expect(page.getByTestId('date-picker')).toBeVisible();
  });

  test('目標入力画面の主要UIが表示される', async ({ page }) => {
    await page.goto('/goal');
    await waitForOverlayToDisappear(page);
    await expect(page.getByTestId('goal-weight-input')).toBeVisible();
    await expect(page.getByTestId('save-btn')).toBeVisible();
  });

  test('エクスポート・管理画面の主要UIが表示される', async ({ page }) => {
    await page.goto('/export');
    await waitForOverlayToDisappear(page);
    await expect(page.getByTestId('download-json-btn')).toBeVisible();
  });
});
