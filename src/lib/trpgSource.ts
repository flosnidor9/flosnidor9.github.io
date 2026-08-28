type TrpgSourceManifest = {
  version: 1;
  parts: string[];
};

function isManifest(value: unknown): value is TrpgSourceManifest {
  return Boolean(
    value
      && typeof value === 'object'
      && (value as TrpgSourceManifest).version === 1
      && Array.isArray((value as TrpgSourceManifest).parts)
      && (value as TrpgSourceManifest).parts.every((part) => typeof part === 'string' && part.length > 0),
  );
}

export async function fetchTrpgSource(sourceUrl: string, signal?: AbortSignal) {
  const response = await fetch(sourceUrl, { signal });
  if (!response.ok) throw new Error('Unable to load TRPG log source.');
  const source = await response.text();

  let manifest: unknown;
  try {
    manifest = JSON.parse(source);
  } catch {
    return source;
  }
  if (!isManifest(manifest)) return source;

  const baseUrl = new URL(sourceUrl, window.location.href);
  const basePath = baseUrl.pathname.replace(/[^/]+$/, '');
  const partUrls = manifest.parts.map((part) => new URL(part, baseUrl));
  if (partUrls.some((partUrl) => partUrl.origin !== baseUrl.origin || !partUrl.pathname.startsWith(basePath))) {
    throw new Error('Invalid TRPG log source manifest.');
  }

  const parts = await Promise.all(partUrls.map(async (partUrl) => {
    const partResponse = await fetch(partUrl, { signal });
    if (!partResponse.ok) throw new Error('Unable to load a TRPG log source part.');
    return partResponse.text();
  }));
  return parts.join('');
}
