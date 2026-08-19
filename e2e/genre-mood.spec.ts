import { test, expect } from "@playwright/test";

test.describe("Genre × Mood mobile switching", () => {
  test("genre chips change selection and results", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "RESONANT" })).toBeVisible();

    const jazz = page.getByTestId("genre-jazz");
    await expect(jazz).toHaveAttribute("aria-pressed", "true");

    async function selectGenre(id: string) {
      const btn = page.getByTestId(`genre-${id}`);
      await btn.scrollIntoViewIfNeeded();
      await btn.click({ force: false });
      await expect(btn).toHaveAttribute("aria-pressed", "true", { timeout: 10_000 });
    }

    async function signature(): Promise<string> {
      await page.waitForTimeout(1500);
      const rows = page.locator("[class*='rounded-xl']").filter({ has: page.getByRole("button", { name: /Play|Pause/i }) });
      const n = await rows.count();
      const parts: string[] = [];
      for (let i = 0; i < Math.min(n, 8); i++) {
        const text = (await rows.nth(i).innerText()).replace(/\s+/g, " ").trim();
        parts.push(text.slice(0, 80));
      }
      return parts.join(" || ");
    }

    await selectGenre("hip-hop");
    await expect(page.getByTestId("genre-jazz")).toHaveAttribute("aria-pressed", "false");
    const hip = await signature();

    await selectGenre("rock");
    const rock = await signature();
    expect(rock).not.toEqual(hip);

    await selectGenre("electronic");
    const elec = await signature();
    expect(elec).not.toEqual(rock);

    await selectGenre("ambient");
    const amb = await signature();
    expect(amb).not.toEqual(elec);

    await page.getByTestId("mood-warm").click();
    await expect(page.getByTestId("mood-warm")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("mood-calm").click();
    await expect(page.getByTestId("mood-calm")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("genre-ambient")).toHaveAttribute("aria-pressed", "true");
  });

  test("all four platform links render on a track", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("genre-jazz").click();
    await page.waitForTimeout(2500);
    for (const name of ["Spotify", "Apple Music", "YouTube", "SoundCloud"]) {
      const link = page.getByRole("link", { name: new RegExp(name, "i") }).first();
      await expect(link).toBeVisible({ timeout: 15_000 });
      const href = await link.getAttribute("href");
      expect(href).toMatch(/^https?:\/\//);
      expect(href).not.toContain("resonant-woad");
    }
  });

  test("bottom nav routes", async ({ page }) => {
    await page.goto("/");
    for (const { name, path } of [
      { name: "Radio", path: "/radio" },
      { name: "Search", path: "/search" },
      { name: "AI", path: "/ai" },
      { name: "Discover", path: "/discover" },
      { name: "Library", path: "/library" },
    ]) {
      await page.getByRole("link", { name }).click();
      await expect(page).toHaveURL(new RegExp(path));
      await expect(page.locator("body")).not.toContainText("This page could not be found");
    }
  });
});
