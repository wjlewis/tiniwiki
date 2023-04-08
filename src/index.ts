import { generateNoteHtml } from './html';
import fs from 'fs';

const source = fs.readFileSync(0, 'utf-8');
const html = generateNoteHtml(source);
fs.writeFileSync(1, html);
