import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';

const htmlPath = '/private/tmp/claude-501/-Users-louis-Desktop-Projet-de-fin-d-ann-e-optiq-app/5f53f380-da73-4ae8-b0b1-37eabb92927b/scratchpad/dossier-bloc2-complet.html';
const outPath = path.join(os.homedir(), 'Desktop', 'dossier-optiq.pdf');

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();

await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0', timeout: 60000 });

await page.pdf({
  path: outPath,
  format: 'A4',
  margin: { top: '1.8cm', right: '1.8cm', bottom: '1.8cm', left: '1.8cm' },
  printBackground: true,
  displayHeaderFooter: false,
});

await browser.close();
console.log('✅ PDF généré :', outPath);
