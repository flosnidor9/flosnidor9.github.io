import { readFileSync, writeFileSync } from 'node:fs';

const [sourcePath, outputPath] = process.argv.slice(2);

if (!sourcePath || !outputPath) {
  throw new Error('Usage: node scripts/prepare-characters.mjs <source> <output>');
}

const archive = JSON.parse(readFileSync(sourcePath, 'utf8'));
const characters = Array.isArray(archive.characters) ? archive.characters : [];

// Private links used to be stored beside public character data. Removing this
// legacy field prevents it from reaching the public static-site bundle.
const publicArchive = {
  ...archive,
  characters: characters.map((character) => {
    const publicCharacter = { ...character };
    delete publicCharacter.privateLinkItems;
    return publicCharacter;
  }),
};

writeFileSync(outputPath, `${JSON.stringify(publicArchive, null, 2)}\n`);
