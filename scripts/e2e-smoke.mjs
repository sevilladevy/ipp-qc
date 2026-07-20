import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:5173";
const EMAIL = process.env.E2E_EMAIL || "admin@ipp.com";
const PASSWORD = process.env.E2E_PASSWORD || "admin@123";
const FIXTURE_CONFIG_PATH =
  process.env.E2E_FIXTURE_CONFIG_PATH || "scripts/e2e-fixture-config.json";
const OUT_DIR = path.resolve("reports");
const OUT_FILE = path.join(OUT_DIR, "e2e-smoke-summary.json");
const SCREENSHOT_DIR = path.join(OUT_DIR, "e2e-screenshots");

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function loadFixtureConfig() {
  const abs = path.resolve(FIXTURE_CONFIG_PATH);
  if (!fs.existsSync(abs)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(abs, "utf8"));
    return {
      ...parsed,
      __path: abs,
    };
  } catch {
    return null;
  }
}

const fixtureConfig = loadFixtureConfig();
const DATE_FROM = process.env.E2E_DATE_FROM || fixtureConfig?.from || "2000-01-01";
const DATE_TO =
  process.env.E2E_DATE_TO || fixtureConfig?.to || new Date().toISOString().slice(0, 10);
const PART_FILTER = process.env.E2E_PART_FILTER || fixtureConfig?.partFilter || "";
const EXPECTED_BY_MODE = fixtureConfig?.expectedByMode ?? null;
const ENFORCE_PERIOD_ASSERTIONS =
  process.env.E2E_ENFORCE_PERIOD_ASSERTIONS === "true" || Boolean(EXPECTED_BY_MODE);

const result = {
  baseUrl: BASE_URL,
  credentialsEmail: EMAIL,
  dateRange: { from: DATE_FROM, to: DATE_TO },
  fixture: fixtureConfig
    ? {
        path: fixtureConfig.__path,
        partFilter: PART_FILTER,
        expectedByMode: EXPECTED_BY_MODE,
      }
    : null,
  startedAt: new Date().toISOString(),
  steps: [],
  console: {
    errors: [],
    warnings: [],
    lockWarnings: [],
    chartSizeWarnings: [],
  },
  network: {
    failed: [],
    badRequest400: [],
    invalidDateQuery: [],
  },
  assertions: {
    loggedIn: false,
    dashboardHasData: false,
    analyticsParetoNgByProdukVisible: false,
    analyticsParetoCopqVisible: false,
  },
  periodChecks: {
    dashboard: {},
    analytics: {},
  },
  artifacts: {
    screenshots: [],
  },
  passed: false,
};

function pushStep(step, status, detail = "") {
  result.steps.push({ step, status, detail, at: new Date().toISOString() });
}

function parseMetricNumber(value) {
  const normalized = String(value ?? "")
    .replace(/[^\d-]/g, "")
    .trim();
  if (!normalized) return 0;
  return Number(normalized);
}

async function waitForPath(page, pathName, timeout = 30000) {
  await page.waitForFunction(
    (expectedPath) => window.location.pathname === expectedPath,
    pathName,
    {
      timeout,
    },
  );
}

async function waitForReportsFetch(page, timeout = 20000) {
  await page
    .waitForResponse(
      (response) =>
        response.url().includes("/rest/v1/inspection_reports") &&
        response.request().method() === "GET",
      { timeout },
    )
    .catch(() => null);
  await page.waitForTimeout(1200);
}

async function ensureLoginFormHydrated(page) {
  await page.waitForFunction(
    () => {
      const emailInput = document.querySelector('input[type="email"]');
      if (!emailInput) return false;
      emailInput.blur();
      emailInput.focus();
      const field = emailInput.closest(".ipp-field");
      return Boolean(field && field.classList.contains("ipp-focused"));
    },
    null,
    { timeout: 15000 },
  );
}

async function submitLoginWithRetry(page, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    await ensureLoginFormHydrated(page);
    const authResponsePromise = page
      .waitForResponse(
        (response) =>
          response.url().includes("/auth/v1/token") && response.request().method() === "POST",
        { timeout: 8000 },
      )
      .catch(() => null);

    await page.click('button[type="submit"]');
    const authResponse = await authResponsePromise;
    if (authResponse) return authResponse;
    await page.waitForTimeout(1000);
  }
  throw new Error("Form login tidak men-trigger request auth ke Supabase.");
}

async function captureScreenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${Date.now()}-${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  result.artifacts.screenshots.push(filePath);
}

async function readDashboardKpis(page) {
  const outputRaw = await page.getByTestId("dashboard-kpi-total-output-value").innerText();
  const reportsRaw = await page.getByTestId("dashboard-kpi-reports-value").innerText();
  return {
    output: parseMetricNumber(outputRaw),
    reports: parseMetricNumber(reportsRaw),
  };
}

async function readAnalyticsOutput(page) {
  const outputRaw = await page.getByTestId("analytics-kpi-output-value").innerText();
  return {
    output: parseMetricNumber(outputRaw),
  };
}

function assertPeriodValues(scope, mode, actual, failures) {
  const expected = EXPECTED_BY_MODE?.[mode];
  if (ENFORCE_PERIOD_ASSERTIONS && expected) {
    if (typeof expected.output === "number" && actual.output !== expected.output) {
      failures.push(
        `${scope} ${mode}: expected output ${expected.output}, actual ${actual.output}`,
      );
    }
    if (
      typeof expected.reports === "number" &&
      "reports" in actual &&
      actual.reports !== expected.reports
    ) {
      failures.push(
        `${scope} ${mode}: expected reports ${expected.reports}, actual ${actual.reports}`,
      );
    }
    return;
  }

  if (!Number.isFinite(actual.output) || actual.output < 0) {
    failures.push(`${scope} ${mode}: nilai output KPI tidak valid`);
  }
  if ("reports" in actual && (!Number.isFinite(actual.reports) || actual.reports < 0)) {
    failures.push(`${scope} ${mode}: nilai reports KPI tidak valid`);
  }
}

async function runDashboardPeriodChecks(page, failures) {
  pushStep("Dashboard period checks", "running");

  if (PART_FILTER) {
    await page.getByPlaceholder("Filter part").first().fill(PART_FILTER);
    await waitForReportsFetch(page);
  }

  const modes = ["daily", "weekly", "monthly", "range"];
  for (const mode of modes) {
    await page.getByTestId(`dashboard-period-mode-${mode}`).click();
    if (mode === "range") {
      await page.getByTestId("dashboard-period-from").fill(DATE_FROM);
      await page.getByTestId("dashboard-period-to").fill(DATE_TO);
    }
    await waitForReportsFetch(page);
    const kpi = await readDashboardKpis(page);
    result.periodChecks.dashboard[mode] = kpi;
    assertPeriodValues("dashboard", mode, kpi, failures);
  }

  const hasNoReportState = (await page.locator("text=Belum ada data laporan").count()) > 0;
  result.assertions.dashboardHasData = !hasNoReportState;

  pushStep("Dashboard period checks", failures.length ? "failed" : "passed");
}

async function runAnalyticsPeriodChecks(page, failures) {
  pushStep("Analytics period checks", "running");

  if (PART_FILTER) {
    await page.getByPlaceholder("Filter part").first().fill(PART_FILTER);
    await waitForReportsFetch(page);
  }

  const modes = ["daily", "weekly", "monthly", "range"];
  for (const mode of modes) {
    await page.getByTestId(`analytics-period-mode-${mode}`).click();
    if (mode === "range") {
      await page.getByTestId("analytics-period-from").fill(DATE_FROM);
      await page.getByTestId("analytics-period-to").fill(DATE_TO);
    }
    await waitForReportsFetch(page);

    const output = await readAnalyticsOutput(page);
    result.periodChecks.analytics[mode] = output;
    assertPeriodValues("analytics", mode, output, failures);

    const emptyCount = await page.locator("text=Tidak ada data analytics pada filter ini").count();
    const expectedReports = EXPECTED_BY_MODE?.[mode]?.reports;
    if (
      ENFORCE_PERIOD_ASSERTIONS &&
      typeof expectedReports === "number" &&
      expectedReports > 0 &&
      emptyCount > 0
    ) {
      failures.push(`analytics ${mode}: muncul empty state padahal fixture expected reports > 0`);
    }
  }

  pushStep("Analytics period checks", failures.length ? "failed" : "passed");
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error") result.console.errors.push(text);
    if (msg.type() === "warning") result.console.warnings.push(text);
    if (text.includes('Lock "lock:sb-') && text.includes("was not released within 5000ms")) {
      result.console.lockWarnings.push(text);
    }
    if (text.includes("The width(-1) and height(-1) of chart should be greater than 0")) {
      result.console.chartSizeWarnings.push(text);
    }
  });

  page.on("response", (response) => {
    const url = response.url();
    const status = response.status();
    if (status >= 400) result.network.failed.push({ url, status });
    if (status === 400) result.network.badRequest400.push(url);

    const hasInvalidGte = /report_date=gte\.(?:&|$)/.test(url);
    const hasInvalidLte = /report_date=lte\.(?:&|$)/.test(url);
    if (url.includes("inspection_reports") && (hasInvalidGte || hasInvalidLte)) {
      result.network.invalidDateQuery.push(url);
    }
  });

  try {
    pushStep("Open login page", "running");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await ensureLoginFormHydrated(page);
    pushStep("Open login page", "passed");

    pushStep("Login", "running");
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    const authResponse = await submitLoginWithRetry(page);
    if (!authResponse.ok()) {
      throw new Error(`Login Supabase gagal (status ${authResponse.status()})`);
    }
    await waitForPath(page, "/", 45000);
    await page.waitForSelector("text=Dashboard", { timeout: 20000 });
    result.assertions.loggedIn = true;
    pushStep("Login", "passed");

    const failures = [];
    await runDashboardPeriodChecks(page, failures);

    pushStep("Open analytics page", "running");
    await page.click('a[href="/analitik"]');
    await waitForPath(page, "/analitik");
    await page.waitForSelector("text=Analytics Management View", { timeout: 20000 });
    pushStep("Open analytics page", "passed");

    await runAnalyticsPeriodChecks(page, failures);

    await page.getByTestId("analytics-tab-metrics").click();
    await page.waitForTimeout(1200);
    result.assertions.analyticsParetoNgByProdukVisible =
      (await page.locator("text=NG Pareto By Produk").count()) > 0;

    if (!result.assertions.loggedIn) failures.push("Login gagal");
    if (!result.assertions.analyticsParetoNgByProdukVisible) {
      failures.push("Chart NG Pareto By Produk tidak tampil");
    }
    if (result.network.invalidDateQuery.length > 0) {
      failures.push("Masih ada query tanggal invalid report_date=gte.");
    }
    if (result.network.badRequest400.some((url) => url.includes("inspection_reports"))) {
      failures.push("Masih ada response 400 dari inspection_reports");
    }
    if (result.console.chartSizeWarnings.length > 0) {
      failures.push("Masih ada warning ukuran chart width(-1)/height(-1)");
    }

    result.passed = failures.length === 0;
    if (failures.length) {
      await captureScreenshot(page, "assertions-failed");
      pushStep("Assertions", "failed", failures.join("; "));
    } else {
      pushStep("Assertions", "passed");
    }
  } catch (error) {
    await captureScreenshot(page, "runtime-error");
    pushStep("Run E2E smoke", "failed", error instanceof Error ? error.message : String(error));
    result.passed = false;
  } finally {
    result.finishedAt = new Date().toISOString();
    fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 2), "utf8");
    await context.close();
    await browser.close();
  }
}

await run();

if (!result.passed) {
  console.error(`E2E failed. See ${OUT_FILE}`);
  process.exit(1);
}

console.log(`E2E passed. See ${OUT_FILE}`);
