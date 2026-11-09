import { expect, test } from "@playwright/test";

for (const locale of ["si", "ta", "en"]) {
  test(`/${locale}/ renders the converter`, async ({ page }) => {
    await page.goto(`/${locale}/`);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("textarea")).toBeVisible();
  });
}

test("converts FM text as it is typed", async ({ page }) => {
  await page.goto("/en/");
  await page.getByLabel("FM").check();
  await page.locator("textarea").fill("wdhqfndajka");
  await expect(page.locator("output")).toHaveText("ආයුබෝවන්");
  await expect(page.locator("output")).toHaveAttribute("lang", "si");
});

test("converts Bamini text to Tamil", async ({ page }) => {
  await page.goto("/en/");
  await page.getByLabel("Bamini").check();
  await page.locator("textarea").fill("jkpo;");
  await expect(page.locator("output")).toHaveText("தமிழ்");
  await expect(page.locator("output")).toHaveAttribute("lang", "ta");
});
