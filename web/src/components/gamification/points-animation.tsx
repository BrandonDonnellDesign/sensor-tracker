'use client';

import { useState, useEffect } from 'react';

interface PointsAnimationProps {
  points: number;
  onComplete?: () => void;
}

export function PointsAnimation({ points, onComplete }: PointsAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete?.();
      }, 300);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 transition-all duration-300 ${
      isVisible ? 'scale-100 opacity-100' : 'scale-150 opacity-0'
    }`}>
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-full shadow-2xl">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">⭐</span>
          <span className="text-xl font-bold">+{points} points!</span>
        </div>
      </div>
    </div>
  );
}