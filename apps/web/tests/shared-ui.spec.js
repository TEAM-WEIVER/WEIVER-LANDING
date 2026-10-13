import { test, expect } from '@playwright/test';

async function openLanding(page) {
  await page.route('**/api/v1/**', (route) => route.fulfill({ json: { visitorId: '550e8400-e29b-41d4-a716-446655440000' } }));
  await page.goto('/');
}

test('hero pause and header reservation CTA keep their behavior', async ({ page }) => {
  await openLanding(page);
  const pause = page.getByRole('button', { name: '영상 일시정지' });
  await pause.click();
  await expect(page.getByRole('button', { name: '영상 재생' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '영상 재생' }).click();
  await expect(pause).toHaveAttribute('aria-pressed', 'false');
  await page.locator('.site-head').getByRole('link', { name: '사전예약', exact: true }).click();
  await expect(page.locator('#demo-title')).toBeInViewport();
  await expect(page.locator('.lead .desc')).toHaveText('기업마다 반복하던 서류와 면접 준비는 이제 한 번으로. 나의 역량을 등록하면, 기업이 먼저 컨택합니다.');
});

test('reduced motion and dark theme retain readable controls without horizontal overflow', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await openLanding(page);
  await expect(page.locator('#pause')).toHaveCount(0);
  await page.locator('#reserve').scrollIntoViewIfNeeded();
  await expect(page.getByRole('combobox', { name: /^직군/ })).toBeVisible();
  await expect(page.getByRole('radio').first()).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#reserve').screenshot({ path: testInfo.outputPath('reservation-dark.png') });
});
