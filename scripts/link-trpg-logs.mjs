import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const repositoryRoot = process.env.TRPG_LOGS_PATH
  ? path.resolve(process.env.TRPG_LOGS_PATH)
  : path.resolve(workspaceRoot, '..', 'Trpg-Logs');
const source = path.join(repositoryRoot, 'public');
const link = path.join(workspaceRoot, 'public', 'trpg-logs');

if (!fs.existsSync(source)) {
  throw new Error(`Trpg-Logs public directory was not found: ${source}`);
}

if (fs.existsSync(link)) {
  const linkStat = fs.lstatSync(link);
  if (!linkStat.isSymbolicLink()) {
    // With core.symlinks=false, Git checks out the tracked macOS/Linux symlink
    // as a small text file containing its target. Replace only that known
    // placeholder; a real directory or unrelated file remains protected.
    const gitSymlinkPlaceholder = linkStat.isFile()
      && /(?:^|[\\/])Trpg-Logs[\\/]public\s*$/.test(fs.readFileSync(link, 'utf8'));
    if (!gitSymlinkPlaceholder) {
      throw new Error(`Expected a development junction at ${link}; refusing to replace an existing directory.`);
    }
    fs.unlinkSync(link);
    fs.symlinkSync(source, link, 'junction');
    console.log(`Replaced Git symlink placeholder: ${link} -> ${source}`);
  } else {
    const target = path.resolve(path.dirname(link), fs.readlinkSync(link));
    if (target !== path.resolve(source)) {
      throw new Error(`The existing TRPG junction points elsewhere: ${target}`);
    }
  }
} else {
  fs.symlinkSync(source, link, 'junction');
  console.log(`Linked local TRPG source: ${link} -> ${source}`);
}
