import { autocompletePlaces, resolvePlaceDetails } from '@homepage/home-data';

import { getHomeDataRuntime } from '@/lib/cloudflare-runtime';

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { query?: string; placeId?: string };

    if (body.placeId?.trim()) {
      const hint = await resolvePlaceDetails(
        body.placeId,
        getHomeDataRuntime(),
      );
      return json({ hint });
    }

    const suggestions = await autocompletePlaces(
      body.query ?? '',
      getHomeDataRuntime(),
    );
    return json({ suggestions });
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error ? error.message : 'Location search failed.',
      },
      { status: 400 },
    );
  }
}
