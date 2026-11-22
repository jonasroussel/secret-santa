import type { HealthResponse } from '@secret-santa/shared';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api.ts';

export function App() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    void api<HealthResponse>('/api/health').then((result) => {
      if (result.ok) setVersion(result.data.version);
    });
  }, []);

  return (
    <main>
      <h1>Secret Santa</h1>
      {version && <p>Version {version}</p>}
    </main>
  );
}
