import { expect, test } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";

const baseUrl = "http://127.0.0.1:3000";
let server: ChildProcess | undefined;

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error("frontend server did not become ready");
}

test.beforeAll(async () => {
  server = spawn("npm", ["run", "start", "--", "--port", "3000"], {
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: "pipe",
    shell: process.platform === "win32",
  });
  await waitForServer();
});

test.afterAll(() => {
  server?.kill();
});

test("home and console open", async ({ page }) => {
  await page.goto(baseUrl);
  await expect(page.getByText("ReKeyShare").first()).toBeVisible();
  await page.goto(`${baseUrl}/console`);
  await expect(page.getByText("ReKeyShare：基于代理重加密的数据安全共享管理系统")).toBeVisible();
});

test("key console views do not crash", async ({ page }) => {
  for (const view of ["proof", "attack", "evidence"]) {
    await page.goto(`${baseUrl}/console?view=${view}`);
    await expect(page.getByText(/backend online|mock source/)).toBeVisible();
  }
});

test("backend offline is explicitly marked", async ({ page }) => {
  await page.goto(`${baseUrl}/console`);
  await expect(page.getByText(/source: mock|backend online/)).toBeVisible();
});
