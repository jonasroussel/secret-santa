import type { HealthResponse } from '@secret-santa/shared';
import { CheckIcon, CircleIcon, LockIcon, SendIcon } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api.ts';

export function App() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    void api<HealthResponse>('/api/health').then((result) => {
      if (result.ok) setVersion(result.data.version);
    });
  }, []);

  return (
    <main className='mx-auto flex max-w-xl flex-col gap-10 px-6 py-8'>
      <header>
        <p className='font-heading text-primary italic'>Secret Santa</p>
        <h1 className='text-primary mt-2 text-[2rem] leading-tight font-semibold'>Noël 2026 chez Papi</h1>
        <p className='text-muted-foreground mt-2'>Page de démonstration des composants.</p>
      </header>

      <DemoSection title='Boutons'>
        <Button size='lg' className='w-full'>
          Lancer le tirage
        </Button>
        <div className='flex flex-wrap gap-3'>
          <Button>Valider</Button>
          <Button variant='secondary'>Ajouter</Button>
          <Button variant='outline'>Annuler</Button>
          <Button disabled>Désactivé</Button>
        </div>
        <div className='grid grid-cols-2 gap-2'>
          <Button variant='outline' size='sm'>
            Copier le lien
          </Button>
          <Button variant='secondary' size='sm'>
            <SendIcon data-icon='inline-start' />
            Envoyer
          </Button>
        </div>
        <Button variant='link' className='self-start'>
          + Ajouter un couple
        </Button>
      </DemoSection>

      <DemoSection title='Champs'>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor='event-name'>Nom de l'événement</FieldLabel>
            <Input id='event-name' placeholder='Noël 2026 chez Papi' />
            <FieldDescription>Il apparaîtra dans le message de chaque participant.</FieldDescription>
          </Field>
          <Field data-invalid>
            <FieldLabel htmlFor='first-name'>Prénom</FieldLabel>
            <Input id='first-name' defaultValue='Marie' aria-invalid />
            <FieldError>Ce prénom est déjà dans la liste.</FieldError>
          </Field>
        </FieldGroup>
      </DemoSection>

      <DemoSection title='Étiquettes'>
        <div className='flex flex-wrap gap-2'>
          <Badge>8 personnes</Badge>
          <Badge variant='success'>
            <CheckIcon />
            Lien ouvert
          </Badge>
          <Badge variant='pending'>
            <CircleIcon />
            Pas encore ouvert
          </Badge>
        </div>
      </DemoSection>

      <DemoSection title='Carte'>
        <Card>
          <CardHeader>
            <CardTitle>Papi</CardTitle>
            <CardDescription>Organisateur</CardDescription>
            <CardAction>
              <Badge variant='success'>
                <CheckIcon />
                Lien ouvert
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className='grid grid-cols-2 gap-2'>
            <Button variant='outline' size='sm'>
              Copier le lien
            </Button>
            <Button variant='secondary' size='sm'>
              Envoyer
            </Button>
          </CardContent>
        </Card>
      </DemoSection>

      <DemoSection title='Messages'>
        <Alert>
          <LockIcon />
          <AlertTitle>Le tirage est fait.</AlertTitle>
          <AlertDescription>Personne, pas même vous, ne voit qui offre à qui.</AlertDescription>
        </Alert>
        <Alert variant='soft'>
          <LockIcon />
          <AlertDescription>
            <strong>C’est un secret !</strong> Ne le dis à personne. Tu peux revenir sur ce lien quand tu veux.
          </AlertDescription>
        </Alert>
      </DemoSection>

      <DemoSection title='Confirmation'>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant='outline' className='self-start'>
              Ouvrir la confirmation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lancer le tirage ?</DialogTitle>
              <DialogDescription>
                Une fois le tirage fait, la liste des participants ne pourra plus être modifiée.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant='outline'>Annuler</Button>
              </DialogClose>
              <Button>Lancer le tirage</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DemoSection>

      {version && <p className='text-muted-foreground text-center text-sm'>Version {version}</p>}
    </main>
  );
}

function DemoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className='flex flex-col gap-4'>
      <h2 className='text-secondary text-[1.3125rem] font-semibold'>{title}</h2>
      {children}
    </section>
  );
}
