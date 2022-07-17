import { promises as fsPromises } from 'fs';
import { join } from 'path';
import playwright from 'playwright';

const studentListUrl = 'https://bluearchive.wiki/wiki/Characters';

const asyncWriteFile = async (filename:string, data:any) => {
    try {
        await fsPromises.writeFile(join(__dirname, filename), data, {flag: 'a'})
        const contents = await fsPromises.readFile(
            join(__dirname, filename),
            'utf-8',
        );

        return contents;
    } catch (err) {
        // handle error
    }
};

(async () => {
    const browser = await playwright.chromium.launch();
    const page = await browser.newPage();

    console.log(`Find links at ${studentListUrl}`);

    await page.goto(studentListUrl);

    const links = await page.$$eval('a:has(img)', elements => elements.filter((element:HTMLAnchorElement) => {
        const parentsRegex = /^((?!\().)*$/;
        const elemHref = element.href;
        const elemTitle = element.title;
        return elemHref.endsWith(elemTitle.replace(/ /g, '_')) && (elemTitle) && elemHref.indexOf(':') === elemHref.lastIndexOf(':') && parentsRegex.test(element.textContent);
    }).map((element:HTMLAnchorElement) => {
        return {
            link: element.href,
            img: (element.firstChild as HTMLImageElement).src
        };
    }));

    links.forEach(link => {
        console.log(link);
    });

    asyncWriteFile('./example.txt', JSON.stringify(links, null, 2));

    console.log(`${links.length} links found`);

    await browser.close();
})();
