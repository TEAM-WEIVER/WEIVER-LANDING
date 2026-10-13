import { test, expect } from '@playwright/test';
import { JOB_FAMILIES, APPLICANT_TYPES, PRIMARY_ROLES } from '../src/survey-options';

const ID = '770e8400-e29b-41d4-a716-446655440002';
const TOKEN = 'A'.repeat(43);
const KEY = `weiver.survey.v1.${ID}`;

async function setup(page, { rejectStorage = false, duplicate = false } = {}) {
  const reservations = [];
  const events = [];
  if (rejectStorage) {
    await page.addInitScript(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (this === localStorage) throw new DOMException('blocked', 'QuotaExceededError');
        return original.call(this, key, value);
      };
    });
  }
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = route.request().postDataJSON();
    if (path.endsWith('/bootstrap')) {
      await route.fulfill({ json: { visitorId: '550e8400-e29b-41d4-a716-446655440000' } });
    } else if (path.endsWith('/events')) {
      events.push(body);
      await route.fulfill({ status: 200, body: '' });
    } else if (path.endsWith('/reservations')) {
      reservations.push(body);
      await route.fulfill(duplicate
        ? { status: 409, json: { error: 'DUPLICATE_EMAIL' } }
        : { status: 201, json: { id: ID, surveyAccessToken: TOKEN, survey: { status: 'not_started' } } });
    } else {
      throw new Error(`Unexpected stage-2 request: ${path}`);
    }
  });
  await page.goto('/');
  await page.locator('#reserve').scrollIntoViewIfNeeded();
  return { reservations, events };
}

async function choose(page, name, code) {
  const option = [...JOB_FAMILIES, ...APPLICANT_TYPES, ...Object.values(PRIMARY_ROLES).flat()].find((item) => item.code === code);
  await page.getByRole('combobox', { name }).click();
  await page.getByRole('option', { name: option.label, exact: true }).click();
}

async function fill(page) {
  await choose(page, /^직군/, 'FE');
  await choose(page, /현재 지원 유형/, 'entry_level');
  await choose(page, /주 관심 직무/, 'web_frontend');
  await page.getByRole('textbox', { name: '이름', exact: true }).fill('홍길동');
  await page.getByRole('textbox', { name: '이메일', exact: true }).fill('test@example.com');
  await page.getByRole('checkbox', { name: /개인정보 수집/ }).check();
}

async function submit(page) {
  await page.getByRole('button', { name: '사전예약하기', exact: true }).click();
}

test('requires the three questions and consent; changing family resets the role', async ({ page }) => {
  const { reservations } = await setup(page);
  await page.getByRole('textbox', { name: '이름', exact: true }).fill('홍길동');
  await page.getByRole('textbox', { name: '이메일', exact: true }).fill('test@example.com');
  await submit(page);
  expect(reservations).toHaveLength(0);
  await expect(page.getByRole('combobox', { name: /주 관심 직무/ })).toBeDisabled();
  await fill(page);
  await choose(page, /^직군/, 'BE');
  await expect(page.getByRole('combobox', { name: /주 관심 직무/ })).toHaveText('주 관심 직무 선택');
  await page.getByRole('combobox', { name: /주 관심 직무/ }).click();
  await expect(page.getByRole('option', { name: '웹 프론트엔드 (서비스·제품 UI)', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await submit(page);
  expect(reservations).toHaveLength(0);
  await choose(page, /주 관심 직무/, 'server_api');
  await page.getByRole('checkbox', { name: /개인정보 수집/ }).uncheck();
  await submit(page);
  expect(reservations).toHaveLength(0);
  await page.getByRole('checkbox', { name: /개인정보 수집/ }).check();
  await submit(page);
  await expect(page.locator('.reservation-message[role="status"]')).toContainText('사전예약이 완료됐습니다');
  expect(reservations[0]).toMatchObject({ jobFamily: 'BE', primaryRole: 'server_api', privacyConsent: true });
});

test('sends stable codes, preserves credentials across reloads, and keeps analytics free of answers and tokens', async ({ page }) => {
  const { reservations, events } = await setup(page);
  await fill(page);
  await submit(page);
  await expect(page.locator('.reservation-message[role="status"]')).toContainText('사전예약이 완료됐습니다');
  expect(reservations).toHaveLength(1);
  expect(reservations[0]).toMatchObject({ jobFamily: 'FE', applicantType: 'entry_level', primaryRole: 'web_frontend', privacyConsent: true });
  await expect.poll(() => events.filter((event) => event.eventName === 'reservation_completed').length).toBe(1);
  expect(events.some((event) => event.eventName.startsWith('survey_'))).toBe(false);
  for (const event of events) {
    expect(JSON.stringify(event)).not.toContain(TOKEN);
    expect(JSON.stringify(event)).not.toContain('test@example.com');
    expect(JSON.stringify(event)).not.toContain('홍길동');
  }
  expect(JSON.parse(await page.evaluate((key) => localStorage.getItem(key), KEY)))
    .toEqual({ reservationId: ID, surveyAccessToken: TOKEN });
  await page.reload();
  expect(JSON.parse(await page.evaluate((key) => localStorage.getItem(key), KEY))).toHaveProperty('surveyAccessToken', TOKEN);
});

test('storage failure keeps reservation successful without promising a deferred survey', async ({ page }) => {
  const { reservations, events } = await setup(page, { rejectStorage: true });
  await fill(page);
  await submit(page);
  await expect(page.locator('.reservation-message[role="status"]')).toContainText('사전예약이 완료됐습니다');
  await expect(page.locator('.reservation-message[role="status"]')).not.toContainText('이어서');
  expect(reservations).toHaveLength(1);
  await expect.poll(() => events.filter((event) => event.eventName === 'reservation_completed').length).toBe(1);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('duplicate email never stores a token or emits a completion', async ({ page }) => {
  const { events } = await setup(page, { duplicate: true });
  await fill(page);
  await submit(page);
  await expect(page.getByRole('alert')).toHaveText('이미 사전예약된 이메일입니다.');
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBeNull();
  expect(events.some((event) => event.eventName === 'reservation_completed')).toBe(false);
});

test('all family choices render within the viewport with readable controls', async ({ page }, testInfo) => {
  await setup(page);
  for (const [family, count] of [['FE', 7], ['BE', 6], ['AI', 10]]) {
    await choose(page, /^직군/, family);
    const trigger = page.getByRole('combobox', { name: /주 관심 직무/ });
    await trigger.click();
    await expect(page.getByRole('option')).toHaveCount(count);
    const popup = await page.getByRole('listbox').boundingBox();
    expect(popup.x).toBeGreaterThanOrEqual(0);
    expect(popup.x + popup.width).toBeLessThanOrEqual(page.viewportSize().width);
    await page.keyboard.press('Escape');
    const select = await trigger.boundingBox();
    expect(select.width).toBeGreaterThan(150);
    expect(select.x + select.width).toBeLessThanOrEqual(page.viewportSize().width);
  }
  if (testInfo.project.name === 'mobile') {
    const boxes = await page.locator('.reservation-survey [data-slot="select-trigger"]').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().y));
    expect(boxes[0]).toBeLessThan(boxes[1]);
    expect(boxes[1]).toBeLessThan(boxes[2]);
  }
  await page.locator('#reserve').screenshot({ path: testInfo.outputPath('reservation.png') });
});

test('participation cards support arrow keys and space toggles consent', async ({ page }) => {
  const { reservations } = await setup(page);
  const choices = page.getByRole('radio');
  await choices.first().focus();
  await page.keyboard.press('ArrowRight', { delay: 100 });
  await expect(choices.last()).toBeChecked();
  await expect(page.locator('.reservation-copy output')).toHaveText('역매칭 준비 체험');
  await fill(page);
  const consent = page.getByRole('checkbox', { name: /개인정보 수집/ });
  await consent.focus();
  await page.keyboard.press('Space');
  await expect(consent).not.toBeChecked();
  await submit(page);
  expect(reservations).toHaveLength(0);
  await expect(page.getByRole('alert')).toHaveText('개인정보 수집·이용에 동의해주세요.');
  await consent.focus();
  await page.keyboard.press('Space');
  await submit(page);
  await expect(page.getByRole('status').filter({ hasText: '사전예약이 완료됐습니다' })).toBeVisible();
  expect(reservations[0].reservationType).toBe('REVERSE_MATCHING');
});

test('pending submission disables controls and failure keeps inputs for retry', async ({ page }) => {
  const { reservations, events } = await setup(page);
  let finish;
  const gate = new Promise((resolve) => { finish = resolve; });
  await page.route('**/api/v1/reservations', async (route) => {
    await gate;
    await route.fulfill({ status: 500, json: { error: 'INTERNAL_ERROR' } });
  });
  await fill(page);
  await submit(page);
  await expect(page.getByRole('button', { name: '제출 중...' })).toBeDisabled();
  await expect(page.getByRole('combobox', { name: /^직군/ })).toBeDisabled();
  await expect(page.getByRole('checkbox', { name: /개인정보 수집/ })).toBeDisabled();
  await expect(page.getByRole('radio').first()).toBeDisabled();
  finish();
  await expect(page.getByRole('alert')).toHaveText('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  await expect(page.getByRole('textbox', { name: '이메일', exact: true })).toHaveValue('test@example.com');
  expect(events.some((event) => event.eventName === 'reservation_completed')).toBe(false);
  await page.unroute('**/api/v1/reservations');
  await submit(page);
  await expect(page.locator('.reservation-message[role="status"]')).toContainText('사전예약이 완료됐습니다');
  expect(reservations).toHaveLength(1);
});

test('custom dropdown validates missing values and supports keyboard selection and Escape', async ({ page }, testInfo) => {
  const { reservations } = await setup(page);
  await page.getByRole('textbox', { name: '이름', exact: true }).fill('홍길동');
  await page.getByRole('textbox', { name: '이메일', exact: true }).fill('test@example.com');
  await page.getByRole('checkbox', { name: /개인정보 수집/ }).check();
  await submit(page);
  const family = page.getByRole('combobox', { name: /^직군/ });
  await expect(family).toBeFocused();
  await expect(family).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#job-family-error')).toHaveText('직군을 선택해주세요.');
  expect(reservations).toHaveLength(0);
  await family.press('Space');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await expect(family).toHaveText('프론트엔드');
  await expect(family).toHaveAttribute('aria-invalid', 'false');
  const role = page.getByRole('combobox', { name: /주 관심 직무/ });
  await role.click();
  await expect.poll(() => page.getByRole('listbox').evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
  await page.screenshot({ path: testInfo.outputPath('custom-select-open.png') });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(role).toBeFocused();
  await choose(page, /주 관심 직무/, 'performance_platform');
  await expect(role).toHaveText('웹 성능 / 프론트엔드 플랫폼 (SSR, 빌드, 인프라)');
  const box = await role.boundingBox();
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width);
});
