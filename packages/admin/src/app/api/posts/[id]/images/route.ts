import {
  appendImagesToCollection,
  type UploadedImageInput,
} from '@homepage/home-data';

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

function parseCollectionId(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Invalid collection id.');
  }

  return parsed;
}

async function readImagesFromFormData(formData: FormData) {
  const files = formData
    .getAll('images')
    .filter((value): value is File => value instanceof File && value.size > 0);

  const images: UploadedImageInput[] = [];
  for (const file of files) {
    images.push({
      name: file.name,
      type: file.type,
      buffer: Buffer.from(await file.arrayBuffer()),
    });
  }

  return images;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const collectionId = parseCollectionId(id);
    const formData = await request.formData();
    const images = await readImagesFromFormData(formData);

    const collection = await appendImagesToCollection(collectionId, images);
    return json({ collection });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'Image upload failed.',
      },
      { status: 400 },
    );
  }
}
