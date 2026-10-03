import { chromium } from 'playwright';

const email = 'invalid-credentials@example.com';
const password = 'DefinitelyNotARealPassword123!';

const browser = await chromium.launch({ headless: false });
let page;

try {
  page = await browser.newPage();
  await page.goto('https://www.amazon.com/', {
    waitUntil: 'domcontentloaded',
  });

  await page.getByRole('link', { name: /hello,\s*sign in/i }).click();

  const emailField = page.getByRole('textbox').first();
  await emailField.waitFor({ state: 'visible', timeout: 15_000 });
  await emailField.fill(email);
  await page.getByRole('button', { name: 'Continue' }).click();

  const passwordField = page.locator('#ap_password');
  const unknownEmailHeading = page.getByRole('heading', {
    name: /looks like you're new to amazon/i,
  });
  const nextStep = await Promise.race([
    passwordField
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => 'password'),
    unknownEmailHeading
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => 'unknown-email'),
  ]);

  if (nextStep === 'unknown-email') {
    console.log(
      'Amazon did not recognize the synthetic email. Stopped before account creation.',
    );
  } else {
    await passwordField.fill(password);
    await page.locator('#signInSubmit').click();

    const error = page.locator('#auth-error-message-box');
    await error.waitFor({ state: 'visible', timeout: 15_000 });
    console.log('Amazon rejected the test credentials:');
    console.log((await error.innerText()).trim());
  }
} catch (error) {
  console.error(
    'The sign-in flow did not complete as expected. Amazon may have changed its page or shown an interstitial/CAPTCHA.',
    `Current URL: ${page?.url() ?? 'unavailable'}`,
    error,
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
