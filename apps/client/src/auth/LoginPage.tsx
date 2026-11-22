import { Brand } from '@/components/brand.tsx';

import { RequestLinkForm } from './RequestLinkForm.tsx';
import { VerifyLink } from './VerifyLink.tsx';

export function LoginPage() {
  const token = new URLSearchParams(location.search).get('token');

  return (
    <main className='mx-auto flex max-w-xl flex-col gap-6 px-6 py-8'>
      <Brand />
      {token ? <VerifyLink token={token} /> : <RequestLinkForm />}
    </main>
  );
}
