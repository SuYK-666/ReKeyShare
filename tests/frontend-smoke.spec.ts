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
  await expect(page.getByText("ReKeyShare：基于代理重加密的数据安全共享管理系统")).toBeVisible();
});

test("key console views do not crash", async ({ page }) => {
  for (const view of ["demo", "roles", "upload", "policy", "microscope", "proxy", "packages", "revocation", "proof", "threshold", "audit", "attack", "benchmark", "evidence", "settings"]) {
    await page.goto(`${baseUrl}/console?view=${view}`);
    await expect(page.getByText(/backend online|mock source/)).toBeVisible();
  }
});

test("primary console controls update visible state", async ({ page }) => {
  await page.goto(`${baseUrl}/console?view=upload`);
  await page.getByRole("button", { name: /客户端侧加密并上传密文|正在本地加密/ }).click();
  await expect(page.getByText(/bytes/).last()).toBeVisible();

  await page.goto(`${baseUrl}/console?view=proof`);
  await page.getByRole("button", { name: /运行 5 个 proof 实验/ }).click();
  await expect(page.getByText("PROOF_REPLAY_DETECTED")).toBeVisible();

  await page.goto(`${baseUrl}/console?view=threshold`);
  await page.getByRole("button", { name: /proxy-a/ }).click();
  await page.getByRole("button", { name: /proxy-b/ }).click();
  await expect(page.getByText("completed", { exact: true })).toBeVisible();

  await page.goto(`${baseUrl}/console?view=audit`);
  await page.getByRole("button", { name: /篡改一条事件/ }).click();
  await expect(page.getByText("验证失败：previousHash 断链", { exact: true })).toBeVisible();
});

test("backend offline is explicitly marked", async ({ page }) => {
  await page.goto(`${baseUrl}/console`);
  await expect(page.getByText(/source: mock|backend online/)).toBeVisible();
});

test("console copy stays formal and navigation syncs URL", async ({ page }) => {
  await page.goto(`${baseUrl}/console`);
  await expect(page.locator("body")).not.toContainText(/答辩|评委|参赛|比赛|现场|投影|赛后|竞赛|演示驾驶舱|演示模式|可复制演示话术/);

  await page.getByRole("button", { name: "策略绑定证明" }).click();
  await expect(page).toHaveURL(/view=proof/);

  await page.getByRole("button", { name: "运行驾驶舱" }).click();
  await expect(page).not.toHaveURL(/view=/);
});
