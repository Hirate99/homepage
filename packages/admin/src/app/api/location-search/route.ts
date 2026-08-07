import {
  autocompletePlaces,
  LocationServiceConfigurationError,
  resolvePlaceDetails,
} from '@homepage/home-data';

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

    if (!body.query?.trim()) {
      return json({ error: 'Enter a location to search.' }, { status: 400 });
    }

    const suggestions = await autocompletePlaces(
      body.query,
      getHomeDataRuntime(),
    );
    return json({ suggestions });
  } catch (error) {
    console.error('Location search failed.', error);

    if (error instanceof LocationServiceConfigurationError) {
      return json(
        { error: 'Location search is temporarily unavailable.' },
        { status: 503 },
      );
    }

    return json(
      { error: 'Location search failed. Please try again.' },
      { status: 502 },
    );
  }
}
