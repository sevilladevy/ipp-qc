/**
 * Test utilities for E2E tests
 */

/**
 * Wait for a specific response from the network
 */
export async function waitForResponse(
  page: any,
  urlPattern: RegExp,
  timeout = 10000,
): Promise<any> {
  return page.waitForResponse(
    (response: any) => urlPattern.test(response.url()),
    { timeout },
  );
}

/**
 * Wait for API calls to complete
 */
export async function waitForApiCalls(page: any, timeout = 10000): Promise<void> {
  // Wait for inspection_reports
  await waitForResponse(
    page,
    /\/rest\/v1\/inspection_reports/,
    timeout,
  ).catch(() => null);
}

/**
 * Fill form fields with validation
 */
export async function fillAndValidate(
  page: any,
  selector: string,
  value: string,
): Promise<void> {
  await page.fill(selector, value);
  // Wait for any validation to complete
  await page.waitForTimeout(100);
}

/**
 * Check for console errors
 */
export function collectConsoleErrors(page: any): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (msg: any) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });
  return Promise.resolve(errors);
}

/**
 * Take screenshot on failure
 */
export async function screenshotOnFailure(
  page: any,
  name: string,
  dir = "reports/screenshots",
): Promise<void> {
  await page.screenshot({
    path: `${dir}/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * Login helper
 */
export async function login(
  page: any,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/");
}

/**
 * Logout helper
 */
export async function logout(page: any): Promise<void> {
  await page.click('button[title="Logout"]');
  await page.waitForSelector('input[type="email"]');
}
