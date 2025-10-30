import Image from 'next/image';
import { useState } from 'react';
import { ImageIcon } from 'lucide-react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  fill?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  fill = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  onError,
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setImageError(true);
    setIsLoading(false);
    onError?.();
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  if (imageError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}
        style={{ width, height }}
      >
        <ImageIcon className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`relative ${isLoading ? 'animate-pulse bg-gray-200 dark:bg-gray-700' : ''} ${className}`}>
      <Image
        src={src}
        alt={alt}
        {...(!fill && width && { width })}
        {...(!fill && height && { height })}
        fill={fill}
        priority={priority}
        sizes={sizes}
        quality={quality}
        placeholder={placeholder}
        {...(blurDataURL && { blurDataURL })}
        className={`${fill ? 'object-cover' : ''} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onError={handleError}
        onLoad={handleLoad}
      />
    </div>
  );
}

// Preset configurations for common use cases
export const ImagePresets = {
  avatar: {
    width: 40,
    height: 40,
    className: 'rounded-full',
    quality: 80,
  },
  thumbnail: {
    width: 150,
    height: 150,
    className: 'rounded-lg',
    quality: 75,
  },
  hero: {
    fill: true,
    priority: true,
    quality: 90,
    sizes: '100vw',
  },
  card: {
    width: 300,
    height: 200,
    className: 'rounded-lg',
    quality: 75,
  },
} as const;