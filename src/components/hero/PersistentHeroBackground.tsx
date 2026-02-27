'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { pickHeroImage } from '@/lib/heroImage';

type Props = {
  imagePaths: string[];
};

export default function PersistentHeroBackground({ imagePaths }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    setSrc(pickHeroImage(imagePaths));
  }, [imagePaths]);

  if (!src) return null;

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <div className="absolute inset-0 hero-blur-bg">
        <Image src={src} alt="" fill className="object-cover" priority />
      </div>
    </div>
  );
}
