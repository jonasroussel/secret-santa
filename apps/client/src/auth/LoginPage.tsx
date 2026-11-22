import { useState } from 'react';

import { Brand } from '@/components/brand.tsx';

import { RequestCodeForm } from './RequestCodeForm.tsx';
import { VerifyCodeForm } from './VerifyCodeForm.tsx';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  return (
    <main className='mx-auto flex max-w-xl flex-col gap-6 px-6 py-8'>
      <Brand />
      {codeSent ? (
        <VerifyCodeForm email={email} onChangeEmail={() => setCodeSent(false)} />
      ) : (
        <RequestCodeForm
          initialEmail={email}
          onSent={(sentTo) => {
            setEmail(sentTo);
            setCodeSent(true);
          }}
        />
      )}
    </main>
  );
}
