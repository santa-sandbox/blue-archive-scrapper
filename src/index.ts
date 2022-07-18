import { promises as fsPromises, createWriteStream, access } from "fs";
import { join } from "path";
import playwright from "playwright";
import https from "https";
import { IncomingMessage } from "http";

const studentListUrl = "https://bluearchive.wiki/wiki/Characters";

const asyncWriteFile = async (filename: string, data: any) => {
  try {
    await fsPromises.writeFile(join(__dirname, filename), data, { flag: "a" });
    const contents = await fsPromises.readFile(
      join(__dirname, filename),
      "utf-8"
    );

    return contents;
  } catch (err) {
    // handle error
  }
};

(async () => {
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  console.log(`Find links at ${studentListUrl}`);

  await page.goto(studentListUrl);

  const hrefs = await page.$$eval("a:has(img)", (elements) =>
    elements
      .filter((element: HTMLAnchorElement) => {
        const parentsRegex = /^((?!\().)*$/;
        const elemHref = element.href;
        const elemTitle = element.title;
        return (
          elemHref.endsWith(elemTitle.replace(/ /g, "_")) &&
          elemTitle &&
          elemHref.indexOf(":") === elemHref.lastIndexOf(":") &&
          parentsRegex.test(element.textContent)
        );
      })
      .map((element: HTMLAnchorElement) => {
        return {
          link: element.href,
          img: (element.firstChild as HTMLImageElement).src,
        };
      })
  );

  await fsPromises.mkdir("./dist/thumbnail", { recursive: true });

  hrefs.forEach(async (href) => {
    const filePath = href.img
      .substring(href.img.lastIndexOf("/") + 1)
      .replace(/%28|%29/g, "");
    access(`./dist/thumbnail/${filePath}`, (error) => {
      if (!error) {
        console.log(`${filePath} existed`);
      } else {
        const file = createWriteStream(`./dist/thumbnail/${filePath}`);
        file.on("finish", (_: any) => console.log(`${filePath} downloaded`));
        https.get(href.img, (response: IncomingMessage) => response.pipe(file));
      }
    });
  });

  asyncWriteFile("./example.txt", JSON.stringify(hrefs, null, 2));

  console.log(`${hrefs.length} links found`);

  await browser.close();
})();
