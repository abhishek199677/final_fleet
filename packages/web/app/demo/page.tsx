import { LiquidButton, MetalButton } from "@/components/ui/liquid-glass-button";

export default function DemoOne() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-muted/40 p-8">
      <div className="relative h-[200px] w-full max-w-[800px] rounded-2xl border bg-card">
        <LiquidButton className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          Liquid Glass
        </LiquidButton>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <MetalButton variant="default">Metal</MetalButton>
        <MetalButton variant="primary">Primary</MetalButton>
        <MetalButton variant="success">Success</MetalButton>
        <MetalButton variant="error">Error</MetalButton>
        <MetalButton variant="gold">Gold</MetalButton>
        <MetalButton variant="bronze">Bronze</MetalButton>
      </div>
    </div>
  );
}
