import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const drawAnimationDuration = () => (reducedMotion() ? 600 : 2600);

const cardWidth = 96;
const cardHeight = 56;
const columns = 3;
const boxY = 100;
const cardsY = -150;

const spread = (max: number) => (Math.random() * 2 - 1) * max;
// Every keyframe uses the same transform functions so the browser interpolates each one (the flip stays a flip).
const pose = (x: number, y: number, tilt: number, flip: number, scale: number) =>
  `translate(${x}px, ${y}px) rotate(${tilt}deg) rotateY(${flip}deg) scale(${scale})`;

/** Name cards flip face-down, shuffle and drop into a gift box that closes; never shows who gives to whom. */
export function DrawAnimation({ names }: { names: string[] }) {
  const stage = useRef<HTMLDivElement>(null);
  const reduced = reducedMotion();
  const cards = names.slice(0, 9);

  useLayoutEffect(() => {
    const root = stage.current!;
    const duration = drawAnimationDuration();
    const timing = { duration, fill: 'both', easing: 'ease-in-out' } as const;
    const animations = [root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, fill: 'both' })];
    if (!reduced) {
      const rows = Math.ceil(cards.length / columns);
      root.querySelectorAll<HTMLElement>('[data-card]').forEach((card, index) => {
        const x = ((index % columns) - (columns - 1) / 2) * (cardWidth + 12);
        const y = (Math.floor(index / columns) - (rows - 1) / 2) * (cardHeight + 12) + cardsY;
        const tilt = spread(6);
        const scatter = () => pose(spread(120), spread(110) + cardsY, spread(25), 180, 1);
        animations.push(
          card.animate(
            [
              { offset: 0, opacity: 0, transform: pose(x, y, tilt, 0, 0.6) },
              { offset: 0.1, opacity: 1, transform: pose(x, y, tilt, 0, 1) },
              { offset: 0.25, transform: pose(x, y, tilt, 0, 1) },
              { offset: 0.36, transform: pose(x, y, tilt, 180, 1) },
              { offset: 0.5, transform: scatter() },
              { offset: 0.62, transform: scatter() },
              { offset: 0.74, transform: scatter() },
              { offset: 0.84, opacity: 1, transform: pose(0, boxY - 50, 0, 180, 0.35) },
              { offset: 0.88, opacity: 0, transform: pose(0, boxY - 10, 0, 180, 0.2) },
              { offset: 1, opacity: 0, transform: pose(0, boxY - 10, 0, 180, 0.2) },
            ],
            timing,
          ),
        );
      });
      const box = root.querySelector('[data-box]')!;
      const lid = root.querySelector('[data-lid]')!;
      const bow = root.querySelector('[data-bow]')!;
      animations.push(
        box.animate(
          [
            { offset: 0, opacity: 0, transform: 'translateY(30px)' },
            { offset: 0.62, opacity: 0, transform: 'translateY(30px)' },
            { offset: 0.72, opacity: 1, transform: 'translateY(0)' },
            { offset: 1, opacity: 1, transform: 'translateY(0)' },
          ],
          timing,
        ),
        lid.animate(
          [
            { offset: 0, transform: 'translate(-4px, -6px) rotate(-28deg)' },
            { offset: 0.88, transform: 'translate(-4px, -6px) rotate(-28deg)' },
            { offset: 0.94, transform: 'translate(0, 0) rotate(0deg)' },
            { offset: 1, transform: 'translate(0, 0) rotate(0deg)' },
          ],
          timing,
        ),
        bow.animate(
          [
            { offset: 0, transform: 'scale(0)' },
            { offset: 0.93, transform: 'scale(0)' },
            { offset: 0.97, transform: 'scale(1.25)' },
            { offset: 1, transform: 'scale(1)' },
          ],
          timing,
        ),
      );
    }
    return () => animations.forEach((animation) => animation.cancel());
  }, [cards.length, reduced]);

  return createPortal(
    <div ref={stage} role='status' className='bg-background fixed inset-0 z-60 overflow-hidden [perspective:900px]'>
      <div className='absolute top-1/2 left-1/2 size-0'>
        {!reduced &&
          cards.map((name, index) => (
            <div key={index} data-card className='absolute -top-7 -left-12 h-14 w-24 [transform-style:preserve-3d]'>
              <div className='bg-card border-gold font-heading absolute inset-0 flex items-center justify-center rounded-md border-2 px-1.5 text-lg font-semibold shadow-md [backface-visibility:hidden]'>
                <span className='truncate'>{name}</span>
              </div>
              <div className='bg-primary text-gold absolute inset-0 flex [transform:rotateY(180deg)] items-center justify-center rounded-md shadow-md ring-2 ring-[#d9b56a] [backface-visibility:hidden] ring-inset'>
                ✦
              </div>
            </div>
          ))}
        <div data-box className='absolute -left-16 h-28 w-32' style={{ top: boxY - 40 }}>
          <svg
            data-bow
            viewBox='0 0 64 28'
            className='absolute -top-6 left-6 h-7 w-20 origin-bottom'
            aria-hidden='true'
          >
            <path d='M32 24C22 4 6 2 6 14s16 10 26 10zM32 24c10-20 26-22 26-10s-16 10-26 10z' fill='#b8862b' />
            <circle cx='32' cy='23' r='4' fill='#d9b56a' />
          </svg>
          <div data-lid className='bg-primary-dark absolute top-0 left-0 h-7 w-32 origin-bottom-left rounded-sm'>
            <div className='bg-gold absolute inset-y-0 left-1/2 w-4 -translate-x-1/2' />
          </div>
          <div className='bg-primary absolute top-7 left-2 h-21 w-28 rounded-b-md shadow-lg'>
            <div className='bg-gold absolute inset-y-0 left-1/2 w-4 -translate-x-1/2' />
          </div>
        </div>
        <p
          className='font-heading text-primary absolute w-64 -translate-x-1/2 text-center text-xl italic'
          style={{ top: boxY + 100 }}
        >
          Tirage en cours…
        </p>
      </div>
    </div>,
    document.body,
  );
}
