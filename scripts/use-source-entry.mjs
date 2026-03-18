import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
copyFileSync(join(root, 'index.source.html'), join(root, 'index.html'));
