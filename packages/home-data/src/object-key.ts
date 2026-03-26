function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function getCollectionImageFolder(input: string | null | undefined) {
  const slug = slugify(input ?? '');
  return slug || 'collection';
}

export function createCollectionImageObjectKey(
  folderInput: string | null | undefined,
) {
  const folder = getCollectionImageFolder(folderInput);
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const fileName = `${Array.from(bytes, (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('')}.webp`;
  return `${folder}/${fileName}`;
}
