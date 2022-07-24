import { promises as fsPromises, createWriteStream, access } from 'fs';
import { join } from 'path';
import { chromium } from 'playwright';
import https from 'https';
import { IncomingMessage } from 'http';

// Defined ColumnIndex (ci) for make query on students list understandable
const enum ci {
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

// Defined SkillIndex (si) for make query on Skills table
const enum si {
  EX,
  NORMAL,
  PASSIVE,
  SUB
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

// Extracting data from skill table
const extractSkill = (nodes: Array<SVGElement | HTMLElement>): Ability => {
  let skillName: string;
  let iconUrl: string;
  let levelList: Array<AbilityLevel> = [];
  let skillCost: number = null;
  for (let i = 0; i < nodes.length; i++) {
    if (i == 0) {
      skillName = nodes[i].children[1].children[2].querySelector('b').textContent;
      iconUrl = nodes[i].children[1].children[1].children[1].querySelector('img').src;
    } else if (i == 1) {
      // nothing: it's header
    } else {
      let row = nodes[i].textContent
        .trim()
        .split('\n')
        .filter((t) => t !== '');
      skillCost = row.length > 2 && skillCost != parseInt(row[1]) ? parseInt(row[1]) : skillCost;
      const lv: AbilityLevel = {
        cost: skillCost,
        level: parseInt(row[0]),
        description: row[row.length - 1],
        upgrade: []
      };
      levelList.push(lv);
    }
  }
  skillName = skillName != undefined ? skillName : null;
  iconUrl = iconUrl != undefined ? iconUrl : null;
  return { name: skillName, icon: iconUrl, levels: levelList };
};

// Extracting data from skill upgrade table
const extractUpgrade = (nodes: Array<SVGElement | HTMLElement>): Array<Array<AbilityUpgrade>> => {
  let upgradeList: Array<Array<AbilityUpgrade>> = [];
  let upgrade: Array<AbilityUpgrade>;
  let material: string;
  let matAmount: number;
  for (const node of nodes) {
    upgrade = [];
    for (let i = 1; i < node.children.length; i++) {
      if (node.children[i].children.length == 0) continue;
      material = node.children[i].querySelector('a').title;
      matAmount = parseInt(node.children[i].querySelector('b').textContent.replace(/,/g, ''));
      upgrade.push({ item: material, amount: matAmount });
    }
    upgradeList.push(upgrade);
  }
  return upgradeList;
};

// Extracting data from gift in cafe
const extractGift = (node: SVGElement | HTMLElement) =>
  Array.from(node.children)
    .filter((e) => e.classList.contains('character-gift'))
    .map((e) => (e.firstChild.firstChild as HTMLAnchorElement).title);

// Drill down into more detail of Students
const scrapProfile = async (items: Array<StudentLink>) => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let count = 0;

  for (let item of items) {
    if (count === 5) break;
    const url = item.link;
    await page.goto(url, { timeout: 60000 });

    // Scrap detail data of each student
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
    const profileImage = await page.$eval(
      `//article[@id='Profile_Image-0']/div/div/a/img`,
      (e) => (e as HTMLImageElement).src
    );
    const fullArtwork = await page.$eval(
      `//article[@id='Full_Artwork-0']/div/div/a/img`,
      (e) => (e as HTMLImageElement).src
    );
    const affectionData: Iterable<readonly [number, string]> = await page.$$eval(
      `//td[@class='affection-data']/div`,
      (elements) =>
        elements.map((e) => [
          parseInt(e.dataset.level),
          e.dataset.stats + `${e.children.length == 2 ? ' ❤️' : ''}`
        ])
    );
    const cafeFurniture = async () => {
      try {
        return await page.$eval(
          `//div[@class='character-cafe-interaction']/div/a`,
          (e) => (e as HTMLAnchorElement).title
        );
      } catch (err) {
        return null;
      }
    };
    const favoriteGift = async () => {
      try {
        return await page.$eval(`p:has-text('Her favorite gift')`, extractGift);
      } catch (error) {
        return null;
      }
    };
    const likesGift = async () => {
      try {
        return await page.$eval(`p:has-text('also likes')`, extractGift);
      } catch (error) {
        return null;
      }
    };
    const uniqueWeaponImg = await page.$eval(
      `//tr[@class='weapontable-summary']/td/a/img`,
      (e) => (e as HTMLImageElement).src
    );
    const uniqueWeaponName = await page.$$eval(
      `span.weapon-name-main, span.weapon-name-sub`,
      (span) => span.map((e) => e.textContent)
    );
    const uniqueWeaponDescripton = await page.$eval(`article#English-2`, (e) => e.textContent);
    const uniqueWeaponAffinity = await page.$eval(`td:right-of(td > img:nth-of-type(3))`, (e) =>
      e.textContent
        .trim()
        .split('area affinity')
        .map((s) => s.trim().toUpperCase())
    );
    const uniqueGearImg = async () => {
      try {
        return await page.$eval(
          `//tr[@class='geartable-summary']/td/a/img`,
          (e) => (e as HTMLImageElement).src
        );
      } catch (error) {
        return null;
      }
    };
    const uniqueGearName = async () => {
      try {
        return await page.$$eval(`span.gear-name-main, span.gear-name-sub`, (span) =>
          span.map((e) => e.textContent)
        );
      } catch (error) {
        return null;
      }
    };
    const uniqueGearDescription =
      (await page.$(`article#English-3`)) != null
        ? await page.$eval(`article#English-3`, (e) => e.textContent.trim())
        : null;
    const uniqueGearTier1 =
      (await page.$(`table.geartable > tbody > tr > td:right-of(td:text-is('T1'))`)) != null
        ? await page.$eval(
            `table.geartable > tbody > tr > td:right-of(td:text-is('T1'))`,
            (e) => e.textContent
          )
        : null;
    const uniqueGearTier2 =
      (await page.$(`table.geartable > tbody > tr > td:right-of(td:text-is('T2'))`)) != null
        ? await page.$eval(
            `table.geartable > tbody > tr > td:right-of(td:text-is('T2'))`,
            (e) => e.textContent
          )
        : null;
    // todo: stats
    const exUpgrade = await page.$$eval(
      `//table[contains(@class, 'upgradetable')][1]/tbody/tr[position()>=3]`,
      extractUpgrade
    );
    const exSkill = await page.$$eval(
      `//table[contains(@class, 'skilltable')][1]/tbody/tr`,
      extractSkill
    );
    exSkill.levels.forEach((lv, i) => {
      lv.upgrade.concat(i == 0 ? [] : exUpgrade[i - 1]);
      if (i > 0) {
        lv.upgrade = exUpgrade[i - 1];
      }
    });
    const normalSkill = await page.$$eval(
      `//table[contains(@class, 'skilltable')][2]/tbody/tr`,
      extractSkill
    );
    const passiveSkill = await page.$$eval(
      `//table[contains(@class, 'skilltable')][3]/tbody/tr`,
      extractSkill
    );
    const subSkill = await page.$$eval(
      `//table[contains(@class, 'skilltable')][4]/tbody/tr`,
      extractSkill
    );
    const weaponPassiveSkill = await page.$$eval(
      `//table[contains(@class, 'skilltable')][5]/tbody/tr`,
      extractSkill
    );
    const gearNormalSkill = await page.$$eval(
      `//table[contains(@class, 'skilltable')][6]/tbody/tr`,
      extractSkill
    );
    const isLimited = await page.$(`ul:below(:text('How to Obtain')) >> li:has-text('limited')`);

    // put scrapped data into Student object
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
      images: {
        thumbnail: item.img,
        profile: profileImage,
        fullArt: fullArtwork
      },
      equip1: equip1.toUpperCase(),
      equip2: equip2.toUpperCase(),
      equip3: equip3.toUpperCase(),
      fullName: fullName,
      age: age.includes('??') ? -1 : parseInt(age),
      birthday: birthday,
      height: parseInt(height.replace('cm', '')),
      hobbies: hobbies,
      illustrator: illustrator,
      voiceActress: voiceActress,
      weaponType: item.weaponType,
      bunker: item.bunker === 'Yes' ? true : false,
      releaseDate: item.releaseDate,
      bonusAffection: new Map(affectionData),
      cafe: {
        interact: await cafeFurniture(),
        gift: {
          favorite: await favoriteGift(),
          likes: await likesGift()
        }
      },
      uniqueWeapon: {
        name: uniqueWeaponName,
        img: uniqueWeaponImg,
        description: uniqueWeaponDescripton.trim(),
        affinityUp: uniqueWeaponAffinity
      },
      uniqueGear: {
        name: await uniqueGearName(),
        img: await uniqueGearImg(),
        description: uniqueGearDescription,
        tier: [uniqueGearTier1, uniqueGearTier2]
      },
      skills: {
        ex: exSkill,
        normal: normalSkill,
        passive: passiveSkill,
        sub: subSkill,
        weaponPassive: weaponPassiveSkill,
        gearNormal: gearNormalSkill
      },
      limited: isLimited != null ? true : false
    };
    studentList.push(student);
    console.log(student);

    count = count + 1;
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
    `//table[contains(@class, 'charactertable')]/tbody/tr`,
    (rows) =>
      rows.map((row: HTMLTableRowElement) => {
        const td = row.children;
        return {
          link: (td[ci.NAME].firstChild as HTMLAnchorElement).href,
          img: (td[ci.AVATAR].firstChild.firstChild as HTMLImageElement).src,
          name: td[ci.NAME].firstChild.textContent,
          rarity: td[ci.RARITY].children.length,
          school: td[ci.SCHOOL].textContent,
          playRole: td[ci.ROLE].textContent,
          position: td[ci.POSITION].textContent,
          attackType: td[ci.ATTACK].textContent,
          armorType: td[ci.ARMOR].textContent,
          combatClass: td[ci.COMBAT].textContent,
          weaponType: td[ci.WEAPON].textContent,
          bunker: td[ci.BUNKER].textContent,
          urban: (td[ci.URBAN].firstChild as HTMLAnchorElement).title.charAt(0),
          outdoors: (td[ci.OUTDOORS].firstChild as HTMLAnchorElement).title.charAt(0),
          indoors: (td[ci.INDOORS].firstChild as HTMLAnchorElement).title.charAt(0),
          releaseDate: td[ci.RELEASE].textContent
        };
      })
  );

  await fsPromises.mkdir('./dist/thumbnail', { recursive: true });

  // download thumbnail of students
  let existedThumbnail: number = 0;
  studentRows.forEach(async (row) => {
    const filePath = row.img.substring(row.img.lastIndexOf('/') + 1).replace(/%28|%29/g, '');
    access(`./dist/thumbnail/${filePath}`, (error) => {
      if (!error) {
        existedThumbnail++;
      } else {
        const file = createWriteStream(`./dist/thumbnail/${filePath}`);
        file.on('finish', (_: any) => console.log(`${filePath} downloaded`));
        https.get(row.img, (response: IncomingMessage) => response.pipe(file));
      }
    });
  });

  writeFile('./example.json', JSON.stringify(studentRows, null, 2), true);

  console.log(`${studentRows.length} links found`);
  if (existedThumbnail > 0) {
    console.log(`existed thumbnail: ${existedThumbnail}`);
  }

  await browser.close();

  await scrapProfile(studentRows);

  console.log(`scrapped: ${studentList.length} students`);
})();
