'use client';

import { useEffect, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';

const Roles = ['Software Engineer', 'Photographer'];

export function RoleTicker() {
  const [roleIndex, setRoleIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let timeoutId: number | undefined;

    const scheduleNextRole = () => {
      window.clearTimeout(timeoutId);
      if (document.visibilityState !== 'visible') {
        return;
      }

      timeoutId = window.setTimeout(() => {
        setRoleIndex((current) => (current + 1) % Roles.length);
        scheduleNextRole();
      }, 4200);
    };

    scheduleNextRole();
    document.addEventListener('visibilitychange', scheduleNextRole);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', scheduleNextRole);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setReducedMotion(media.matches);

    updateMotionPreference();
    media.addEventListener('change', updateMotionPreference);
    return () => media.removeEventListener('change', updateMotionPreference);
  }, []);

  const role = Roles[roleIndex];
  const article = /^[aeiou]/i.test(role) ? 'an' : 'a';

  return (
    <div className="w-full min-w-0 max-w-[620px] text-[var(--hero-ink)]">
      <p
        className="text-[1.35rem] leading-none text-transparent sm:text-[2rem]"
        style={{ WebkitTextStroke: '1px var(--hero-accent)' }}
      >
        {article}
      </p>
      <div
        className="relative mt-1 h-[3.4rem] overflow-visible sm:h-[4.3rem]"
        aria-live="polite"
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={role}
            initial={
              reducedMotion
                ? false
                : { opacity: 0, x: 24, clipPath: 'inset(0 100% 0 0)' }
            }
            animate={
              reducedMotion
                ? { opacity: 1, x: 0, skewX: 0, clipPath: 'inset(0 0% 0 0)' }
                : {
                    opacity: [0, 1, 0.35, 1],
                    x: [24, -12, 7, 0],
                    skewX: [-12, 7, -3, 0],
                    clipPath: [
                      'inset(0 100% 0 0)',
                      'inset(0 0% 0 0)',
                      'inset(58% 0 18% 0)',
                      'inset(0 0% 0 0)',
                    ],
                  }
            }
            exit={
              reducedMotion
                ? undefined
                : {
                    opacity: 0,
                    x: -18,
                    clipPath: 'inset(42% 0 36% 0)',
                    transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
                  }
            }
            transition={{
              duration: reducedMotion ? 0 : 0.62,
              ease: [0.16, 1, 0.3, 1],
              times: reducedMotion ? undefined : [0, 0.24, 0.46, 1],
            }}
            className="absolute left-0 top-0 origin-left whitespace-nowrap pb-2 text-[1.75rem] font-semibold leading-[1.16] sm:text-4xl md:text-[2.75rem]"
          >
            <span className="relative z-10">{role}</span>
            <RoleGlitch role={role} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function RoleGlitch({ role }: { role: string }) {
  return (
    <>
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 z-0 text-[var(--hero-accent)] mix-blend-multiply motion-reduce:hidden"
        initial={{ opacity: 0, x: -20 }}
        animate={{
          opacity: [0, 0.9, 0.65, 0],
          x: [-20, 13, -7, 0],
          clipPath: [
            'inset(8% 0 68% 0)',
            'inset(46% 0 32% 0)',
            'inset(72% 0 8% 0)',
            'inset(100% 0 0 0)',
          ],
        }}
        transition={{ duration: 0.62, times: [0, 0.25, 0.62, 1] }}
      >
        {role}
      </motion.span>
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 z-0 text-[var(--hero-signal)] mix-blend-multiply motion-reduce:hidden"
        initial={{ opacity: 0, x: 18 }}
        animate={{
          opacity: [0, 0.85, 0.5, 0],
          x: [18, -11, 5, 0],
          clipPath: [
            'inset(62% 0 14% 0)',
            'inset(20% 0 58% 0)',
            'inset(54% 0 24% 0)',
            'inset(0 0 100% 0)',
          ],
        }}
        transition={{ duration: 0.68, delay: 0.03, times: [0, 0.28, 0.66, 1] }}
      >
        {role}
      </motion.span>
      <motion.span
        aria-hidden="true"
        className="absolute left-0 top-0 z-20 h-px w-full bg-[var(--hero-accent)] shadow-[0_0_8px_var(--hero-signal)] motion-reduce:hidden"
        initial={{ opacity: 0, y: 0, scaleX: 0.15 }}
        animate={{
          opacity: [0, 1, 0.7, 0],
          y: [0, 20, 48, 68],
          scaleX: [0.15, 1, 0.72, 0.2],
        }}
        transition={{ duration: 0.58, ease: 'easeOut' }}
      />
    </>
  );
}
