import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const repositoryRoot = process.env.TRPG_LOGS_PATH
  ? path.resolve(process.env.TRPG_LOGS_PATH)
  : path.resolve(workspaceRoot, '..', 'Trpg-Logs');
const expectedSource = path.join(repositoryRoot, 'public');
const link = path.join(workspaceRoot, 'public', 'trpg-logs');

let linkStat;
try {
  linkStat = fs.lstatSync(link);
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') process.exit(0);
  throw error;
}

if (!linkStat.isSymbolicLink()) {
  throw new Error(`Expected a development junction at ${link}; refusing to remove an existing directory.`);
}

const target = path.resolve(path.dirname(link), fs.readlinkSync(link));
if (target !== path.resolve(expectedSource)) {
  throw new Error(`The existing TRPG junction points elsewhere: ${target}`);
}

fs.rmdirSync(link);
console.log('Removed the local TRPG junction for static export. npm run dev will recreate it.');
