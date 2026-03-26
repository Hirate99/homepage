import { getLocationHint, type UploadedImageInput } from '@homepage/home-data';

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

export async function POST(request: Request) {
  const formData = await request.formData();
  const images = await readImagesFromFormData(formData);

  if (!images.length) {
    return json(
      { error: 'Please choose at least one image.' },
      { status: 400 },
    );
  }

  try {
    const hint = await getLocationHint(images);
    return json({ hint });
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to read location metadata.',
      },
      { status: 500 },
    );
  }
}
