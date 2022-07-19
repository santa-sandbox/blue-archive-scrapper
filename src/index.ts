import { promises as fsPromises, createWriteStream, access } from 'fs';
import { join } from 'path';
import playwright from 'playwright';
import https from 'https';
import { IncomingMessage } from 'http';

// Defined RowIndex (ri) for make query on students list understandable
const enum ri {
  AVATAR,
  NAME,
  RARITY,
  SCHOOL,
  ROLE,
  POSITION,
  ATTACK,
  ARMOR,
  COMBAT,
  WEAPON,
  BUNKER,
  URBAN,
  OUTDOORS,
  INDOORS,
  RELEASE
}

// Default URL students list to start scrapping
const studentListUrl = 'https://bluearchive.wiki/wiki/Characters';
var studentList = [];

// For write contents into file
const writeFile = async (filename: string, data: any): Promise<string> => {
  try {
    await fsPromises.writeFile(join(__dirname, filename), data, { flag: 'a' });
    const contents = await fsPromises.readFile(join(__dirname, filename), 'utf-8');

    return contents;
  } catch (err) {
    // handle error
  }
};

// Drill down into more detail of Students
const scrapProfile = async (items: Array<StudentLink>) => {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();

  for (var item of items) {
    const url = item.link;
    await page.goto(url, { timeout: 60000 });

    const name = await page.$eval('h1#firstHeading', (e) => e.textContent);
    const baseStar = await page.$eval('div.character-rarity', (e) => e.dataset.value);
    const background = await page.$eval('article#English-1', (e) => {
      let b = e.textContent ? e.textContent : Array.from(e.children).map((e1) => e1.textContent);
      return Array.isArray(b) ? b.join(`\n`) : b;
    });
    studentList.push(name);
    console.log(`${name} ${baseStar}⭐`);
    console.log(background);
  }

  await browser.close();
};

// Start scrapping here
(async () => {
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  console.log(`Find links at ${studentListUrl}`);

  await page.goto(studentListUrl);
  const studentRows = await page.$$eval(
    `//table[contains(@class, 'charactertable')]//tbody//tr`,
    (rows) =>
      rows.map((row: HTMLTableRowElement) => {
        const td = row.children;
        return {
          link: (td[ri.NAME].firstChild as HTMLAnchorElement).href,
          img: (td[ri.AVATAR].firstChild.firstChild as HTMLImageElement).src,
          name: td[ri.NAME].firstChild.textContent,
          rarity: td[ri.RARITY].children.length,
          school: td[ri.SCHOOL].textContent,
          playRole: td[ri.ROLE].textContent,
          position: td[ri.POSITION].textContent,
          attackType: td[ri.ATTACK].textContent,
          armorType: td[ri.ARMOR].textContent,
          combatClass: td[ri.COMBAT].textContent,
          weaponType: td[ri.WEAPON].textContent,
          bunker: td[ri.BUNKER].textContent,
          urban: (td[ri.URBAN].firstChild as HTMLAnchorElement).title.charAt(0),
          outdoors: (td[ri.OUTDOORS].firstChild as HTMLAnchorElement).title.charAt(0),
          indoors: (td[ri.INDOORS].firstChild as HTMLAnchorElement).title.charAt(0),
          releaseDate: td[ri.RELEASE].textContent
        };
      })
  );

  await fsPromises.mkdir('./dist/thumbnail', { recursive: true });

  // download thumbnail of students
  studentRows.forEach(async (row) => {
    const filePath = row.img.substring(row.img.lastIndexOf('/') + 1).replace(/%28|%29/g, '');
    access(`./dist/thumbnail/${filePath}`, (error) => {
      if (!error) {
        console.log(`${filePath} existed`);
      } else {
        const file = createWriteStream(`./dist/thumbnail/${filePath}`);
        file.on('finish', (_: any) => console.log(`${filePath} downloaded`));
        https.get(row.img, (response: IncomingMessage) => response.pipe(file));
      }
    });
  });

  writeFile('./example.json', JSON.stringify(studentRows, null, 2));

  console.log(`${studentRows.length} links found`);

  await browser.close();

  await scrapProfile(studentRows);

  console.log(`scrapped: ${studentList.length} students`);
})();
