"use client";

/* eslint-disable @next/next/no-img-element */
import { type PointerEvent, type WheelEvent, useEffect, useRef, useState } from 'react';

export type PortraitCrop = { x: number; y: number; zoom: number };

const MAX_ZOOM = 3;
const clamp = (value: number) => Math.max(-1, Math.min(1, value));

export default function PortraitCropPreview({ file, crop, onCropChange }: { file: File; crop: PortraitCrop; onCropChange: (crop: PortraitCrop) => void }) {
  const [src, setSrc] = useState('');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; crop: PortraitCrop } | null>(null);
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const preventScroll = (event: globalThis.WheelEvent) => event.preventDefault();
    element.addEventListener('wheel', preventScroll, { passive: false });
    return () => element.removeEventListener('wheel', preventScroll);
  }, []);
  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setSrc(String(reader.result));
    reader.readAsDataURL(file);
    return () => reader.abort();
  }, [file]);
  const landscape = size.width >= size.height;
  const frameW = size.width ? (landscape ? ((size.height / size.width) * 100) / crop.zoom : 100 / crop.zoom) : 100;
  const frameH = size.height ? (landscape ? 100 / crop.zoom : ((size.width / size.height) * 100) / crop.zoom) : 100;
  const left = ((crop.x + 1) / 2) * (100 - frameW);
  const top = ((crop.y + 1) / 2) * (100 - frameH);
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const origin = start.current;
    const rect = stage.current?.getBoundingClientRect();
    if (!origin || !rect) return;
    const roomX = rect.width * (1 - frameW / 100);
    const roomY = rect.height * (1 - frameH / 100);
    onCropChange({ ...origin.crop, x: roomX > 0 ? clamp(origin.crop.x + (event.clientX - origin.x) / (roomX / 2)) : origin.crop.x, y: roomY > 0 ? clamp(origin.crop.y + (event.clientY - origin.y) / (roomY / 2)) : origin.crop.y });
  };
  const zoomAt = (clientX: number, clientY: number, nextZoom: number) => {
    const rect = stage.current?.getBoundingClientRect();
    if (!rect || !size.width || !size.height) return;
    const zoom = Math.max(1, Math.min(MAX_ZOOM, nextZoom));
    const oldSide = Math.min(size.width, size.height) / crop.zoom;
    const newSide = Math.min(size.width, size.height) / zoom;
    const oldLeft = ((size.width - oldSide) * (1 + crop.x)) / 2;
    const oldTop = ((size.height - oldSide) * (1 + crop.y)) / 2;
    const pointerX = ((clientX - rect.left) / rect.width) * size.width;
    const pointerY = ((clientY - rect.top) / rect.height) * size.height;
    const newLeft = Math.max(0, Math.min(size.width - newSide, pointerX - ((pointerX - oldLeft) / oldSide) * newSide));
    const newTop = Math.max(0, Math.min(size.height - newSide, pointerY - ((pointerY - oldTop) / oldSide) * newSide));
    onCropChange({ x: size.width === newSide ? 0 : clamp((newLeft / (size.width - newSide)) * 2 - 1), y: size.height === newSide ? 0 : clamp((newTop / (size.height - newSide)) * 2 - 1), zoom });
  };
  return <div className="mt-[0.6rem]"><div ref={stage} className="relative touch-none select-none overflow-hidden bg-[rgba(200,121,147,0.14)]" onPointerMove={move} onPointerUp={() => { start.current = null; }} onPointerCancel={() => { start.current = null; }} onWheel={(event: WheelEvent<HTMLDivElement>) => { event.preventDefault(); zoomAt(event.clientX, event.clientY, crop.zoom + (event.deltaY < 0 ? 0.1 : -0.1)); }}>{src && <img src={src} alt="선택한 프로필 사진 미리보기" className="block h-auto w-full" draggable={false} onLoad={(event) => setSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} />}{size.width > 0 && <div className="pc-crop-frame absolute cursor-grab border-[0.12rem] border-white active:cursor-grabbing" style={{ left: `${left}%`, top: `${top}%`, width: `${frameW}%`, height: `${frameH}%` }} onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); start.current = { x: event.clientX, y: event.clientY, crop }; }} />}</div><label className="mt-[0.55rem] block"><span className="pc-field-label">확대 <output className="ml-[0.25rem]">{crop.zoom.toFixed(1)}×</output></span><input className="w-full accent-[var(--atr-muted)]" type="range" min="1" max={MAX_ZOOM} step="0.1" value={crop.zoom} onChange={(event) => zoomAt((stage.current?.getBoundingClientRect().left ?? 0) + (stage.current?.clientWidth ?? 0) / 2, (stage.current?.getBoundingClientRect().top ?? 0) + (stage.current?.clientHeight ?? 0) / 2, Number(event.target.value))} /></label></div>;
}
