import {
  listCollectionsForAdmin,
  publishCollection,
  type UploadedImageInput,
} from '@homepage/home-data';

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
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

function parseOptionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return undefined;
  }

  return value;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const images = await readImagesFromFormData(formData);

  try {
    const result = await publishCollection({
      title: String(formData.get('title') ?? ''),
      content: parseOptionalString(formData.get('content')),
      sortOrder: parseOptionalNumber(formData.get('sortOrder')),
      coverIndex: parseOptionalNumber(formData.get('coverIndex')) ?? 0,
      images,
      location: {
        latitude: parseOptionalNumber(formData.get('latitude')),
        longitude: parseOptionalNumber(formData.get('longitude')),
        locationName: parseOptionalString(formData.get('locationName')),
        country: parseOptionalString(formData.get('country')),
        region: parseOptionalString(formData.get('region')),
        description: parseOptionalString(formData.get('description')),
      },
    });

    return json({ result });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'Publishing failed.',
      },
      { status: 400 },
    );
  }
}

export async function GET() {
  try {
    const collections = await listCollectionsForAdmin();
    return json({ collections });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'Failed to load posts.',
      },
      { status: 500 },
    );
  }
}
