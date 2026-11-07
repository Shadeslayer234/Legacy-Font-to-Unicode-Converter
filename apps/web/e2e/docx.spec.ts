import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

const NS = `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"`;
const run = (text: string, font: string) =>
  `<w:r><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}"/></w:rPr><w:t xml:space="preserve">${text}</w:t></w:r>`;

/** A small .docx: FM text and English text in one paragraph. */
function docx(): Buffer {
  const body = `<w:p>${run("wdhqfndajka", "FMAbhaya")}${run(" Hello", "Arial")}</w:p>`;
  const zip = zipSync({
    "[Content_Types].xml": strToU8(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`),
    "word/document.xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><w:document ${NS}><w:body>${body}</w:body></w:document>`),
  });
  return Buffer.from(zip);
}

const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

test("converts the FM text in a .docx and leaves English alone", async ({ page }) => {
  await page.goto("/en/");
  await page.getByLabel("Choose a .docx file").setInputFiles({ name: "letter.docx", mimeType: DOCX_TYPE, buffer: docx() });
  await expect(page.getByText("Converted the FMAbhaya text to Unicode.")).toBeVisible();
  await expect(page.getByText("Left unchanged: Arial")).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download the converted file" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("letter.unicode.docx");
  const files = unzipSync(new Uint8Array(await readFile((await download.path())!)));
  const xml = strFromU8(files["word/document.xml"]!);
  expect(xml).toContain("ආයුබෝවන්");
  expect(xml).toContain(" Hello");
});

test("explains that old .doc files need saving as .docx", async ({ page }) => {
  await page.goto("/en/");
  const doc = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  await page.getByLabel("Choose a .docx file").setInputFiles({ name: "old.doc", mimeType: "application/msword", buffer: doc });
  await expect(page.getByRole("alert")).toContainText("This is an old .doc file");
});
