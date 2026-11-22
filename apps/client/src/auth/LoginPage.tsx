import { useState } from 'react';

import { Brand } from '@/components/brand.tsx';

import { RequestCodeForm } from './RequestCodeForm.tsx';
import { VerifyCodeForm } from './VerifyCodeForm.tsx';

export function LoginPage() {
  const [email, setEmail] = useState('');
  // 'too_many_requests': no new code was sent, but one from an earlier mail may still be valid.
  const [codeStep, setCodeStep] = useState<'sent' | 'too_many_requests' | null>(null);

  return (
    <main className='mx-auto flex max-w-xl flex-col gap-6 px-6 py-8'>
      <Brand />
      {codeStep ? (
        <VerifyCodeForm
          email={email}
          tooManyRequests={codeStep === 'too_many_requests'}
          onChangeEmail={() => setCodeStep(null)}
        />
      ) : (
        <RequestCodeForm
          initialEmail={email}
          onSent={(sentTo, step) => {
            setEmail(sentTo);
            setCodeStep(step);
          }}
        />
      )}
    </main>
  );
}
