import { deleteImageFromCollection } from '@homepage/home-data';

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

function parsePositiveInt(value: string, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}.`);
  }

  return parsed;
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; imageId: string }> },
) {
  try {
    const { id, imageId } = await context.params;
    const collectionId = parsePositiveInt(id, 'collection id');
    const targetImageId = parsePositiveInt(imageId, 'image id');

    const collection = await deleteImageFromCollection(
      collectionId,
      targetImageId,
    );

    return json({ collection });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'Image delete failed.',
      },
      { status: 400 },
    );
  }
}
