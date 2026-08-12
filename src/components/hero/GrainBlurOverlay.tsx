'use client';

export default function GrainBlurOverlay() {
  return (
    <div
      className="absolute inset-0 gpu pointer-events-none"
      style={{
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        background: 'rgba(208, 218, 235, 0.055)',
      }}
    />
  );
}
