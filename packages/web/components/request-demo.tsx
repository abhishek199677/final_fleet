'use client';

import { useRef, useState } from 'react';
import SpinningBorderButton from '@/components/ui/spinning-border-button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * "Request Demo" in the dashboard top bar. Clicking it opens the product
 * walkthrough video in a dialog and starts playback immediately (the click is
 * the user gesture browsers require for autoplay with sound). Closing the
 * dialog pauses the video and unmounts it, so no background playback leaks.
 */
export function RequestDemoButton({ className }: { className?: string }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleOpenChange = (next: boolean): void => {
    setOpen(next);
    if (!next) {
      videoRef.current?.pause();
    }
  };

  return (
    <>
      <SpinningBorderButton className={className} onClick={() => setOpen(true)}>
        Request Demo
      </SpinningBorderButton>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="sr-only">Fleet OS product demo</DialogTitle>
            <DialogDescription className="sr-only">
              A short walkthrough of the Fleet OS dashboard: machines, sites,
              deployments, billing and reports.
            </DialogDescription>
          </DialogHeader>

          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            preload="metadata"
            poster="/app-preview-poster.jpg"
            aria-label="Fleet OS product demo video"
            className="aspect-video w-full rounded-md bg-black object-contain"
          >
            <source src="/app-preview.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </DialogContent>
      </Dialog>
    </>
  );
}
