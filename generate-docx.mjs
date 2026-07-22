import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import HTMLtoDOCX from 'html-to-docx';

const html = readFileSync(
  '/private/tmp/claude-501/-Users-louis-Desktop-Projet-de-fin-d-ann-e-optiq-app/5f53f380-da73-4ae8-b0b1-37eabb92927b/scratchpad/dossier-bloc2-complet.html',
  'utf-8'
);

const docx = await HTMLtoDOCX(html, null, {
  table: { row: { cantSplit: true } },
  footer: false,
  header: false,
  pageSize: { width: 12240, height: 15840 }, // A4
  margins: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
});

const out = join(homedir(), 'Desktop', 'dossier-optiq.docx');
writeFileSync(out, docx);
console.log('✅ DOCX généré :', out);
