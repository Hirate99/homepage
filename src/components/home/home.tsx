import { Suspense } from 'react';

import { getCityPosts } from '@/lib/collections';

import { AtlasShell } from './atlas/atlas-shell';
import { GlobeAtlasSection } from './globe-atlas-section';
import { IntroHero } from './intro-hero';
import type { SongDefinition } from './songs';

async function AtlasContent({ song }: { song: SongDefinition }) {
  const posts = await getCityPosts();
  return <GlobeAtlasSection posts={posts} song={song} />;
}

export function Home({ song }: { song: SongDefinition }) {
  return (
    <main
      className="min-w-[280px] overflow-hidden"
      style={{ backgroundColor: song.colors.background }}
    >
      <IntroHero song={song} />
      <Suspense fallback={<AtlasShell song={song} status="loading" />}>
        <AtlasContent song={song} />
      </Suspense>
    </main>
  );
}
