import { expect, test } from "@playwright/test";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";

let baseUrl = "";
let server: ChildProcess | undefined;

async function findFreePort() {
  return new Promise<number>((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() => {
        if (address && typeof address === "object") {
          resolve(address.port);
        } else {
          reject(new Error("could not allocate free port"));
        }
      });
    });
  });
}

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
  const port = await findFreePort();
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn("npm", ["run", "start", "--", "--port", String(port)], {
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: "pipe",
    shell: process.platform === "win32",
  });
  await waitForServer();
});

test.afterAll(() => {
  if (!server?.pid || server.killed) {
    return;
  }
  if (process.platform === "win32") {
    execFileSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    server.kill();
  }
});

test("home and console open", async ({ page }) => {
  await page.goto(baseUrl);
  await expect(page.getByText("ReKeyShare").first()).toBeVisible();
  await page.goto(`${baseUrl}/console`);
  await expect(page.getByRole("button", { name: "运行驾驶舱" })).toBeVisible();
});

test("key console views do not crash", async ({ page }) => {
  for (const view of ["demo", "upload", "proxy", "packages", "attack", "settings"]) {
    await page.goto(`${baseUrl}/console?view=${view}`);
    await expect(page.locator("span").filter({ hasText: /^(online|mock)$/ })).toBeVisible();
  }
});

test("primary console controls update visible state", async ({ page }) => {
  await page.goto(`${baseUrl}/console?view=upload`);
  await page.getByRole("button", { name: /客户端侧加密并上传密文|正在本地加密/ }).click();
  await expect(page.getByText(/bytes/).last()).toBeVisible();
});

test("backend offline is explicitly marked", async ({ page }) => {
  await page.goto(`${baseUrl}/console`);
  await expect(page.locator("span").filter({ hasText: /^(online|mock)$/ })).toBeVisible();
});

test("console navigation syncs URL", async ({ page }) => {
  await page.goto(`${baseUrl}/console`);
  await expect(page.locator("body")).not.toContainText(/答辩|评委|参赛|比赛|现场|投影|赛后|竞赛|演示驾驶舱|演示模式|可复制演示话术/);

  await page.getByRole("button", { name: "攻击验证实验室" }).click();
  await expect(page).toHaveURL(/view=attack/);

  await page.getByRole("button", { name: "运行驾驶舱" }).click();
  await expect(page).not.toHaveURL(/view=/);
});
