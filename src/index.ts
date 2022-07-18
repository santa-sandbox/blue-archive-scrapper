import { promises as fsPromises, createWriteStream, access } from "fs";
import { join } from "path";
import playwright, { BrowserContext } from "playwright";
import https from "https";
import { IncomingMessage } from "http";

const studentListUrl = "https://bluearchive.wiki/wiki/Characters";
var studentList = [];

const writeFile = async (filename: string, data: any):Promise<string> => {
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

const scrapProfile = async (items:Array<StudentLink>) => {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();

  for (var item of items) {
    const url = item.link;
    await page.goto(url, {timeout: 60000});

    const name = await page.$eval('h1#firstHeading', e => e.textContent);
    const baseStar = await page.$eval('div.character-rarity', e => e.dataset.value);
    const background = await page.$eval('article#English-1', (e) => {
      let b = e.textContent ? e.textContent : Array.from(e.children).map(e1 => e1.textContent);
      
      return Array.isArray(b) ? b.join(`\n`) : b;
    });
    // const school = await page.$eval('xpath=//html//body//div[3]//div[3]//div[5]//div[1]//table[1]//tbody//tr[4]//td[1]//p//img', e => e.getAttribute('alt'));
    studentList.push(name);
    console.log(`${name} ${baseStar}⭐`);
    console.log(background);
    // console.log(school);
  }

  await browser.close();
};

(async () => {
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  console.log(`Find links at ${studentListUrl}`);

  await page.goto(studentListUrl);

  const hrefs:Array<StudentLink> = await page.$$eval("a:has(img)", (elements) =>
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

  writeFile("./example.json", JSON.stringify(hrefs, null, 2));

  console.log(`${hrefs.length} links found`);

  await browser.close();

  await scrapProfile(hrefs);

  console.log(`scrapped: ${studentList.length} students`);
})();
