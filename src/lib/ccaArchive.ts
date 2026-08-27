const CCA_ARCHIVE_PAYLOAD = /const\s+s\s*=\s*"([^"]+)"/;

export function isCompressedCcaArchive(html: string) {
  return html.includes('data-ccz-a=') && html.includes('DecompressionStream("gzip")');
}

export async function expandCcaArchive(html: string) {
  if (!isCompressedCcaArchive(html)) return html;

  const payload = html.match(CCA_ARCHIVE_PAYLOAD)?.[1];
  if (!payload || typeof DecompressionStream !== 'function') return html;

  try {
    const compressed = Uint8Array.from(atob(payload), (character) => character.charCodeAt(0));
    const decompressed = await new Response(
      new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip')),
    ).text();
    const [template, assets] = JSON.parse(decompressed) as [string, string[]];
    if (typeof template !== 'string' || !Array.isArray(assets)) return html;

    return template.replace(/ data-ccz-a=([0-9a-z]+)/g, (_, index) => {
      const source = assets[Number.parseInt(index, 36)];
      return source ? ` src="${source}"` : '';
    });
  } catch {
    return html;
  }
}
