import { expect, test } from "@playwright/test";

test.describe("Web full flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/agent", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "ok",
            readiness: { ready: true, reasons: [] },
          }),
        });
        return;
      }

      const body = request.postDataJSON() as { text?: string };
      const text = String(body?.text || "");
      if (text.includes("analyze")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            response:
              "📊 Analysis for github.com/owner/repo\n\nTop contributors:\n🥇 alice: 10 commits (50%)\n🥈 bob: 10 commits (50%)\n\n✅ Verification coverage (top 2): 1/2 verified",
          }),
        });
        return;
      }
      if (text.includes("create")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            response: "✅ Split repaired for github.com/owner/repo!\n📜 Split ID: split-123",
          }),
        });
        return;
      }
      if (text.includes("pay")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            response:
              "✅ Distributed 0.5000 USDC to 1 verified contributors via HOT Pay\nCoverage: 1/2 contributors verified\nProtocol: HOT Partner API\nTransaction: 0xabc123\nSplit: split-123\n⏳ Pending claims for unverified contributors (1):",
          }),
        });
        return;
      }
      if (text.includes("pending")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            response:
              "⏳ Pending claims for github.com/owner/repo\n\n- bob: 1 claim(s), 500000 USDC",
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, response: "ok" }),
      });
    });

    await page.route("**/api/contributor-status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          statuses: [
            { githubUsername: "alice", verified: true, walletAddress: "alice.near" },
            { githubUsername: "bob", verified: false, walletAddress: null },
          ],
        }),
      });
    });

    await page.route("**/api/generate-verification", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ githubVerificationCode: "verify-code-123" }),
      });
    });

    await page.route("**/api/verify-identities", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          githubVerified: true,
          nearVerified: true,
          contractSynced: true,
        }),
      });
    });
  });

  test("dashboard -> splits -> verify flow works", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Control Center")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry Connectivity Check" })).toBeVisible();

    await page.goto("/splits", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("https://github.com/owner/repo").fill("owner/repo");
    await page.getByRole("button", { name: "Analyze Contributions" }).click();
    await expect(page.getByText("Contributor Allocation")).toBeVisible();
    await expect(page.getByText("alice")).toBeVisible();
    await expect(page.getByText("bob")).toBeVisible();

    await page.getByRole("button", { name: "Create Split" }).click();
    await expect(page.getByText("Split repair flow completed.")).toBeVisible();

    await page.getByRole("button", { name: "Pay Now" }).click();
    await expect(page.getByText("Payout Receipt")).toBeVisible();
    await expect(page.getByText("Transaction: 0xabc123")).toBeVisible();

    await page.goto("/verify?repo=owner/repo&user=bob", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("your-github-username").fill("bob");
    await page.getByRole("button", { name: "Generate GitHub Verification Code" }).click();
    await expect(page.getByText("Verification code")).toBeVisible();
    await page.getByPlaceholder("Gist ID or full gist URL").fill("https://gist.github.com/bob/abc123");
    await page.getByRole("button", { name: "Verify Contributor (GitHub + NEAR)" }).click();
    await expect(page.getByText("Contributor verification complete. GitHub and NEAR are linked on-chain.")).toBeVisible();
  });
});
