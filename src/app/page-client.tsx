'use client';

import { useEffect, useState } from 'react';

import { Home } from '@/components/home';
import { type IDisplayImage } from '@/components/home/images';

export default function PageClient() {
  const [images, setImages] = useState<IDisplayImage[]>([]);

  useEffect(() => {
    const fetchImages = async () => {
      const res = await fetch('/api/collections');
      const data: IDisplayImage[] = await res.json();
      setImages(data);
    };
    fetchImages();
  }, []);

  return <Home images={images} />;
}
