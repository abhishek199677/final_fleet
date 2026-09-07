'use client';

import { useRef } from 'react';
import { Camera } from 'lucide-react';

interface PhotoCaptureProps {
  onPhoto: (file: File) => void;
  label?: string;
}

export function PhotoCapture({ onPhoto, label = 'Take Photo' }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPhoto(file);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 rounded-md border border-dashed border-input bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full justify-center"
      >
        <Camera className="h-4 w-4" />
        {label}
      </button>
    </div>
  );
}
