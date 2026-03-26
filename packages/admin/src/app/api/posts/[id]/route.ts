import { deleteCollection, updateCollection } from '@homepage/home-data';

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

function parseOptionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseOptionalString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const collectionId = parseCollectionId(id);
    const body = (await request.json()) as Record<string, unknown>;

    const collection = await updateCollection({
      collectionId,
      title: String(body.title ?? ''),
      content: parseOptionalString(body.content),
      sortOrder: parseOptionalNumber(body.sortOrder),
      coverImageId: parseOptionalNumber(body.coverImageId),
      location: {
        latitude: parseOptionalNumber(body.latitude),
        longitude: parseOptionalNumber(body.longitude),
        locationName: parseOptionalString(body.locationName),
        country: parseOptionalString(body.country),
        region: parseOptionalString(body.region),
        description: parseOptionalString(body.description),
      },
    });

    return json({ collection });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'Update failed.',
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const collectionId = parseCollectionId(id);
    await deleteCollection(collectionId);
    return json({ ok: true });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'Delete failed.',
      },
      { status: 400 },
    );
  }
}
