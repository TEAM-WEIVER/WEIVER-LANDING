import { test, expect } from '@playwright/test';

test('loads landing images, favicon and wordmark within its asset namespace', async ({ page }) => {
  const failedAssets = [];
  page.on('response', (response) => {
    if (new URL(response.url()).pathname.startsWith('/landing-assets/') && response.status() >= 400) {
      failedAssets.push(response.url());
    }
  });
  await page.route('**/api/v1/**', async (route) => {
    await route.fulfill({ json: { visitorId: '550e8400-e29b-41d4-a716-446655440000' } });
  });
  await page.goto('/');
  await expect(page.locator('.wordmark').first()).toBeVisible();
  const images = page.locator('img');
  expect(await images.count()).toBeGreaterThan(0);
  for (const image of await images.all()) {
    await expect(image).toHaveAttribute('src', /^\/landing-assets\//);
    await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true);
  }
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/landing-assets/favicon.png');
  const mask = await page.locator('.logo').first().evaluate((element) => getComputedStyle(element).getPropertyValue('--logo'));
  expect(mask).toContain('/landing-assets/wordmark-mask.png');
  expect(failedAssets).toEqual([]);
});
