import { Suspense } from 'react';
import { WorldConsole } from '@/features/world/components/WorldConsole';
import { ConsoleSkeleton } from '@/features/world/components/ConsoleStates';

export default function HomePage() {
  return (
    <>
      <h1 className="sr-only">Kynetra world console</h1>
      <Suspense fallback={<ConsoleSkeleton />}>
        <WorldConsole />
      </Suspense>
    </>
  );
}
