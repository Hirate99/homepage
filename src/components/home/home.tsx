import type { CityPost } from '@/lib/collections';

import { GlobeAtlas } from './globe-atlas';
import { IntroHero } from './intro-hero';
import type { SongDefinition } from './songs';

export function Home({
  posts,
  song,
}: {
  posts: CityPost[];
  song: SongDefinition;
}) {
  return (
    <main className="min-w-[280px] overflow-hidden bg-[#edf2ef]">
      <IntroHero song={song} />
      <GlobeAtlas posts={posts} />
    </main>
  );
}
