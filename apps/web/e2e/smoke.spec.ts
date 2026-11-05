import { expect, test } from "@playwright/test";

for (const locale of ["si", "ta", "en"]) {
  test(`/${locale}/ renders the converter`, async ({ page }) => {
    await page.goto(`/${locale}/`);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("textarea")).toBeVisible();
  });
}
