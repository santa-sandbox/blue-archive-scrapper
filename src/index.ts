import { promises as fsPromises, createWriteStream, access } from 'fs';
import { join } from 'path';
import { chromium } from 'playwright';
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
const writeFile = async (
  filename: string,
  data: any,
  rmBeforWrite: boolean = false
): Promise<string> => {
  try {
    if (rmBeforWrite) await fsPromises.unlink(join(__dirname, filename));
    await fsPromises.writeFile(join(__dirname, filename), data, { flag: 'a' });
    const contents = await fsPromises.readFile(join(__dirname, filename), 'utf-8');

    return contents;
  } catch (err) {
    // handle error
  }
};

// Drill down into more detail of Students
const scrapProfile = async (items: Array<StudentLink>) => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let count = 0;

  for (var item of items) {
    if (count === 1) break;
    const url = item.link;
    await page.goto(url, { timeout: 60000 });

    const background = await page.$eval('article#English-1', (e) => {
      let b = e.textContent ? e.textContent : Array.from(e.children).map((e1) => e1.textContent);
      return Array.isArray(b) ? b.join(`\n`) : b;
    });
    const equip1 = await page.$eval('td.equipment.equipment-1', (e) => e.dataset.value);
    const equip2 = await page.$eval('td.equipment.equipment-2', (e) => e.dataset.value);
    const equip3 = await page.$eval('td.equipment.equipment-3', (e) => e.dataset.value);
    const fullName = await page.$eval(`td:right-of(:text('Full Name'))`, (e) => e.textContent);
    const age = await page.$eval(`td:right-of(:text-is('Age'))`, (e) => e.textContent);
    const birthday = await page.$eval(`td:right-of(:text('Birthday'))`, (e) => e.textContent);
    const height = await page.$eval(`td:right-of(:text('Height'))`, (e) => e.textContent);
    const hobbies = await page.$eval(`td:right-of(:text('Hobbies'))`, (e) => e.textContent);
    const illustrator = await page.$eval(`td:right-of(:text('Illustrator'))`, (e) => e.textContent);
    const voiceActress = await page.$eval(`td:right-of(:text('Voice'))`, (e) => e.textContent);
    const student: Student = {
      name: item.name,
      rarity: item.rarity,
      background: background,
      school: item.school.toUpperCase(),
      playRole: item.playRole.toUpperCase(),
      position: item.position.toUpperCase(),
      attackType: item.attackType.toUpperCase(),
      armorType: item.armorType.toUpperCase(),
      combatClass: item.combatClass.toUpperCase(),
      affinity: {
        urban: item.urban,
        outdoors: item.outdoors,
        indoors: item.indoors
      },
      weaponType: item.weaponType,
      bunker: item.bunker === 'Yes' ? true : false,
      releaseDate: item.releaseDate
    };
    studentList.push(student);
    console.log(`${student.name} ${student.rarity}⭐`);
    console.log(background);
    console.log(equip1, equip2, equip3);
    console.log(fullName);
    console.log(age);
    console.log(birthday);
    console.log(height);
    console.log(hobbies);
    console.log(illustrator);
    console.log(voiceActress);

    count = 1;
  }

  await browser.close();
};

// Start scrapping here
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  console.log(`Find links at ${studentListUrl}\n`);

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

  writeFile('./example.json', JSON.stringify(studentRows, null, 2), true);

  console.log(`${studentRows.length} links found`);

  await browser.close();

  await scrapProfile(studentRows);

  console.log(`scrapped: ${studentList.length} students`);
})();
