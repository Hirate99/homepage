import { Suspense } from 'react';

import { getCityPosts } from '@/features/collections/server/get-city-posts';
import { SongStoreProvider } from '@/providers/song-store-provider';

import { AtlasShell } from './atlas/atlas-shell';
import { GlobeAtlasSection } from './globe-atlas-section';
import { HomeShell } from './home-shell';
import { IntroHero } from './intro-hero';
import { ScrollDepthSection } from './motion';
import type { SongDefinition } from './songs';

async function AtlasContent() {
  const posts = await getCityPosts();
  return <GlobeAtlasSection posts={posts} />;
}

export function Home({ intro, song }: { intro: string; song: SongDefinition }) {
  return (
    <SongStoreProvider key={song.id} initialSong={song}>
      <HomeShell>
        <ScrollDepthSection variant="hero">
          <IntroHero intro={intro} />
        </ScrollDepthSection>
        <ScrollDepthSection variant="atlas">
          <Suspense fallback={<AtlasShell status="loading" />}>
            <AtlasContent />
          </Suspense>
        </ScrollDepthSection>
      </HomeShell>
    </SongStoreProvider>
  );
}
