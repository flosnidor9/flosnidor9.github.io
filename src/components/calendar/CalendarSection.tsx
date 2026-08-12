'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
  location?: string;
}

interface ExternalEventSlot {
  allDay: boolean;
  startDateTime?: string;
  endDateTime?: string;
}

const CALENDAR_ID = '848efa2587af083c615b7c3581e818075a6489d1d0ce70c4ac3ef60880d0fbae%40group.calendar.google.com';
const EXTERNAL_CALENDAR_IDS = [
  '97lincediini0nmflm951ecbv4@group.calendar.google.com',
  'snqgnamf250qppbvim02otagjg@group.calendar.google.com',
  '43vpniivockejo1q72qi5rcro4@group.calendar.google.com',
];
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const HOUR_REM = 3.8;
const LS_KEY = 'afterroll-event-colors';

const PALETTE = [
  '#d04545', '#d07820', '#b8a010', '#58a028',
  '#18a080', '#1878d0', '#5840c8', '#a030a8',
  '#c83070', '#806840', '#208888', '#e05010',
] as const;

function getStartDate(event: GoogleCalendarEvent) {
  return (event.start.date ?? event.start.dateTime ?? '').slice(0, 10);
}
function isAllDay(event: GoogleCalendarEvent) { return !!event.start.date; }
function toMinutes(dt: string) {
  const d = new Date(dt);
  return d.getHours() * 60 + d.getMinutes();
}
function fmt(dt: string) {
  return new Date(dt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function toDateKey(year: number, month: number, day: number): string {
  const d = new Date(year, month, day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function autoColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff;
  return PALETTE[h % PALETTE.length];
}
function resolveColor(name: string, colorMap: Record<string, string>) {
  const base = colorMap[name] ?? autoColor(name);
  return { base, bg: hexToRgba(base, 0.14) };
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'] as const;

// ── 색상환 유틸 ────────────────────────────────────────────────
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return h * 360;
}

function posToHue(x: number, y: number): number | null {
  const center = WHEEL_SIZE / 2;
  const dx = x - center, dy = y - center;
  if (Math.sqrt(dx * dx + dy * dy) > center - 1) return null;
  return ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
}

function drawWheel(canvas: HTMLCanvasElement, lightness: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 1;
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const dx = px - center, dy = py - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const i = (py * size + px) * 4;
      if (dist <= radius) {
        const hue = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
        const sat = (dist / radius) * 100;
        const [r, g, b] = hslToRgb(hue, sat, lightness);
        data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
      } else {
        data[i + 3] = 0;
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

// ── 셀 이벤트 병합 정렬 ────────────────────────────────────────
type CellItem =
  | { kind: 'mine'; event: GoogleCalendarEvent }
  | { kind: 'ext'; slot: ExternalEventSlot };

function mergeCellItems(events: GoogleCalendarEvent[], extSlots: ExternalEventSlot[]): CellItem[] {
  const items: CellItem[] = [
    ...events.map(event => ({ kind: 'mine' as const, event })),
    ...extSlots.map(slot => ({ kind: 'ext' as const, slot })),
  ];
  return items.sort((a, b) => {
    const aAllDay = a.kind === 'mine' ? isAllDay(a.event) : a.slot.allDay;
    const bAllDay = b.kind === 'mine' ? isAllDay(b.event) : b.slot.allDay;
    if (aAllDay !== bAllDay) return aAllDay ? -1 : 1;
    const aTime = a.kind === 'mine'
      ? (a.event.start.dateTime ?? a.event.start.date ?? '')
      : (a.slot.startDateTime ?? '');
    const bTime = b.kind === 'mine'
      ? (b.event.start.dateTime ?? b.event.start.date ?? '')
      : (b.slot.startDateTime ?? '');
    return aTime.localeCompare(bTime);
  });
}

// ── 컬러 피커 ──────────────────────────────────────────────────
interface PickerState { name: string; x: number; y: number }

const WHEEL_SIZE = 172;
const PICKER_W = 204;
const PICKER_H = 310;

function ColorPickerContent({
  picker, colorMap, onSelect, onReset, onClose,
}: {
  picker: PickerState;
  colorMap: Record<string, string>;
  onSelect: (name: string, hex: string) => void;
  onReset: (name: string) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lightness, setLightness] = useState(45);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredHue, setHoveredHue] = useState<number | null>(null);
  const current = colorMap[picker.name] ?? autoColor(picker.name);
  const sliderHue = hoveredHue ?? hexToHue(current);

  // 색상환 + 십자선을 함께 그림
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawWheel(canvas, lightness);
    if (!cursorPos) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = cursorPos;
    const R = 7;
    // difference blending → 배경색 반전으로 항상 보임
    ctx.save();
    ctx.globalCompositeOperation = 'difference';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - R - 3, y); ctx.lineTo(x + R + 3, y);
    ctx.moveTo(x, y - R - 3); ctx.lineTo(x, y + R + 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }, [lightness, cursorPos]);

  function getCanvasXY(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.round((e.clientX - rect.left) * (WHEEL_SIZE / rect.width)),
      y: Math.round((e.clientY - rect.top) * (WHEEL_SIZE / rect.height)),
    };
  }

  function handleWheelClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const pos = getCanvasXY(e);
    if (!pos) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    // 휠 데이터는 현재 imageData에서 읽어야 하므로 먼저 색상환만 그리고 읽음
    drawWheel(canvas, lightness);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const d = ctx.getImageData(pos.x, pos.y, 1, 1).data;
    if (d[3] === 0) return;
    onSelect(picker.name, rgbToHex(d[0], d[1], d[2]));
    // 클릭 후 십자선 복원
    setCursorPos(pos);
  }

  // fixed 오버레이(inset:0) 안에서 absolute로 배치 → transform 간섭 없음
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const x = picker.x + 12 + PICKER_W > vw ? picker.x - PICKER_W - 12 : picker.x + 12;
  const y = Math.min(Math.max(picker.y - PICKER_H / 2, 8), vh - PICKER_H - 8);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.93 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.93 }}
      transition={{ duration: 0.14 }}
      onClick={e => e.stopPropagation()}
      className="ledger-paper-sheet absolute overflow-hidden rounded-[0.9rem] p-[0.9rem] shadow-xl"
      style={{ left: x, top: y, width: PICKER_W, zIndex: 1 }}
    >
      {/* 이름 + 닫기 */}
      <div className="mb-[0.65rem] flex items-center justify-between gap-[0.5rem]">
        <p className="afterroll-meta truncate text-[0.76rem] uppercase tracking-[0.1em] text-[var(--ledger-ink)]">
          {picker.name}
        </p>
        <button type="button" onClick={onClose}
          className="afterroll-meta shrink-0 text-[0.9rem] leading-none text-[var(--ledger-soft)] hover:text-[var(--ledger-ink)]">
          ×
        </button>
      </div>

      {/* 색상환 */}
      <canvas
        ref={canvasRef}
        width={WHEEL_SIZE}
        height={WHEEL_SIZE}
        onClick={handleWheelClick}
        onMouseMove={e => {
          const pos = getCanvasXY(e);
          setCursorPos(pos);
          setHoveredHue(pos ? posToHue(pos.x, pos.y) : null);
        }}
        onMouseLeave={() => { setCursorPos(null); setHoveredHue(null); }}
        className="block rounded-full"
        style={{ width: WHEEL_SIZE, height: WHEEL_SIZE }}
      />

      {/* 밝기 슬라이더 */}
      <div className="mt-[0.7rem]" style={{ width: WHEEL_SIZE }}>
        <p className="afterroll-meta mb-[0.4rem] text-[0.68rem] text-[var(--ledger-soft)]">밝기</p>
        <input
          type="range" min={15} max={70} value={lightness}
          onChange={e => setLightness(Number(e.target.value))}
          className="color-picker-slider"
          style={{
            width: '100%',
            background: `linear-gradient(to right,
              hsl(${sliderHue},80%,15%) 0%,
              hsl(${sliderHue},80%,${lightness}%) ${((lightness - 15) / 55) * 100}%,
              hsl(${sliderHue},80%,70%) 100%)`,
          }}
        />
      </div>

      {/* 현재 색상 미리보기 */}
      <div className="mt-[0.6rem] h-[1.6rem] rounded-[0.35rem]" style={{ background: current }} />

      {/* 자동 초기화 */}
      {colorMap[picker.name] && (
        <button
          type="button"
          onClick={() => { onReset(picker.name); onClose(); }}
          className="afterroll-meta mt-[0.5rem] w-full rounded-[0.3rem] border border-dashed border-[rgba(87,67,48,0.2)] py-[0.3rem] text-[0.7rem] text-[var(--ledger-soft)] transition-colors hover:border-[rgba(87,67,48,0.4)]"
        >
          자동으로 되돌리기
        </button>
      )}
    </motion.div>
  );
}

// ── 일별 타임라인 ──────────────────────────────────────────────
function DailyTimeline({
  events, day, month, year, colorMap, onOpenPicker, externalSlots,
}: {
  events: GoogleCalendarEvent[];
  day: number; month: number; year: number;
  colorMap: Record<string, string>;
  onOpenPicker: (name: string, x: number, y: number) => void;
  externalSlots: ExternalEventSlot[];
}) {
  const allDay = events.filter(isAllDay);
  const timed = events.filter(e => !isAllDay(e));
  const extAllDay = externalSlots.filter(s => s.allDay);
  const extTimed = externalSlots.filter(s => !s.allDay && s.startDateTime);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const totalRem = 24 * HOUR_REM;
  const d = new Date(year, month, day);
  const dayLabel = `${month + 1}월 ${day}일 (${DAY_NAMES[d.getDay()]})`;
  const hasAnything = events.length > 0 || externalSlots.length > 0;
  const hasTimeline = timed.length > 0 || extTimed.length > 0;

  return (
    <motion.section
      key={`${year}-${month}-${day}`}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="ledger-paper-sheet paper-memo afterroll-shadow-soft relative mt-[1.1rem] overflow-hidden rounded-[1rem] px-[1.2rem] py-[1.2rem] md:px-[1.8rem] md:py-[1.6rem]"
    >
      <span className="afterroll-tape afterroll-tape-pink right-[3.4rem] rotate-[7deg]" />

      <div className="relative z-[1] mb-[1.1rem] flex items-baseline justify-between gap-[1rem]">
        <p className="afterroll-title text-[1.7rem] leading-none text-[var(--ledger-ink)] md:text-[2.2rem]">{dayLabel}</p>
        <span className="ledger-stamp afterroll-meta shrink-0 rounded-[0.25rem] px-[0.65rem] py-[0.3rem] text-[0.78rem] uppercase tracking-[0.08em]">
          Schedule
        </span>
      </div>

      {!hasAnything ? (
        <div className="relative z-[1] py-[2.5rem] text-center">
          <p className="afterroll-title text-[1.8rem] text-[rgba(87,67,48,0.18)]">—</p>
          <p className="afterroll-meta mt-[0.35rem] text-[0.85rem] text-[var(--ledger-soft)]">이 날은 일정이 없습니다</p>
        </div>
      ) : (
        <div className="relative z-[1]">
          {/* 종일 이벤트 */}
          {(allDay.length > 0 || extAllDay.length > 0) && (
            <div className="mb-[1rem] border-b border-[rgba(87,67,48,0.1)] pb-[0.8rem]">
              <p className="afterroll-meta mb-[0.4rem] text-[0.72rem] uppercase tracking-[0.14em] text-[var(--ledger-soft)]">종일</p>
              <div className="flex flex-col gap-[0.3rem]">
                {allDay.map(event => {
                  const color = resolveColor(event.summary, colorMap);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={e => { e.stopPropagation(); onOpenPicker(event.summary, e.clientX, e.clientY); }}
                      className="w-full rounded-[0.4rem] px-[0.75rem] py-[0.38rem] text-left transition-opacity hover:opacity-80"
                      style={{ background: color.bg, borderLeft: `0.18rem solid ${color.base}` }}
                    >
                      <p className="afterroll-meta text-[0.95rem] text-[var(--ledger-ink)]">{event.summary}</p>
                      {event.description ? (
                        <p className="afterroll-body mt-[0.15rem] text-[0.8rem] text-[var(--ledger-muted)]">{event.description}</p>
                      ) : null}
                    </button>
                  );
                })}
                {extAllDay.map((_, i) => (
                  <div
                    key={`ext-allday-${i}`}
                    className="w-full rounded-[0.4rem] px-[0.75rem] py-[0.38rem]"
                    style={{ background: 'rgba(87,67,48,0.05)', borderLeft: '0.18rem dashed rgba(87,67,48,0.25)' }}
                  >
                    <p className="afterroll-meta text-[0.95rem] text-[var(--ledger-soft)]">일정있음</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 시간 타임라인 */}
          {hasTimeline && (
            <div className="relative flex gap-[0.75rem]" style={{ height: `${totalRem}rem` }}>
              <div className="relative w-[2.8rem] shrink-0">
                {hours.map((h, i) => (
                  <span
                    key={h}
                    className="afterroll-meta absolute right-0 text-[0.68rem] leading-none text-[var(--ledger-soft)]"
                    style={{ top: `${i * HOUR_REM + 0.05}rem` }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </span>
                ))}
              </div>

              <div className="relative flex-1">
                {hours.map((_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 border-t border-[rgba(87,67,48,0.1)]"
                    style={{ top: `${i * HOUR_REM}rem` }}
                  />
                ))}

                {timed.map(event => {
                  const color = resolveColor(event.summary, colorMap);
                  const startMin = toMinutes(event.start.dateTime!);
                  const rawEnd = event.end.dateTime ? toMinutes(event.end.dateTime) : startMin + 60;
                  const endMin = rawEnd <= startMin ? 24 * 60 : rawEnd;
                  const topRem = (startMin / 60) * HOUR_REM;
                  const heightRem = Math.max(((endMin - startMin) / 60) * HOUR_REM, HOUR_REM * 0.38);
                  const isShort = heightRem < HOUR_REM * 0.7;

                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={e => { e.stopPropagation(); onOpenPicker(event.summary, e.clientX, e.clientY); }}
                      className="absolute left-[0.2rem] right-[0.2rem] overflow-hidden rounded-[0.45rem] px-[0.65rem] py-[0.3rem] text-left transition-opacity hover:opacity-80"
                      style={{ top: `${topRem}rem`, height: `${heightRem}rem`, background: color.bg, borderLeft: `0.22rem solid ${color.base}` }}
                    >
                      <p className="afterroll-title truncate text-[0.95rem] leading-[1.2] text-[var(--ledger-ink)]">
                        {event.summary}
                      </p>
                      {!isShort && (
                        <p className="afterroll-meta mt-[0.08rem] text-[0.7rem] text-[var(--ledger-soft)]">
                          {fmt(event.start.dateTime!)}
                          {event.end.dateTime ? ` – ${fmt(event.end.dateTime)}` : ''}
                        </p>
                      )}
                      {!isShort && event.location ? (
                        <p className="afterroll-meta mt-[0.08rem] truncate text-[0.68rem] text-[var(--ledger-soft)]">
                          📍 {event.location}
                        </p>
                      ) : null}
                    </button>
                  );
                })}

                {extTimed.map((slot, i) => {
                  const startMin = toMinutes(slot.startDateTime!);
                  const rawEnd = slot.endDateTime ? toMinutes(slot.endDateTime) : startMin + 60;
                  const endMin = rawEnd <= startMin ? 24 * 60 : rawEnd;
                  const topRem = (startMin / 60) * HOUR_REM;
                  const heightRem = Math.max(((endMin - startMin) / 60) * HOUR_REM, HOUR_REM * 0.38);
                  const isShort = heightRem < HOUR_REM * 0.7;

                  return (
                    <div
                      key={`ext-${i}`}
                      className="absolute left-[0.2rem] right-[0.2rem] overflow-hidden rounded-[0.45rem] px-[0.65rem] py-[0.3rem]"
                      style={{ top: `${topRem}rem`, height: `${heightRem}rem`, background: 'rgba(87,67,48,0.05)', borderLeft: '0.22rem dashed rgba(87,67,48,0.25)' }}
                    >
                      <p className="afterroll-title truncate text-[0.88rem] leading-[1.2] text-[var(--ledger-soft)]">
                        일정있음
                      </p>
                      {!isShort && (
                        <p className="afterroll-meta mt-[0.08rem] text-[0.7rem] text-[rgba(87,67,48,0.4)]">
                          {fmt(slot.startDateTime!)}
                          {slot.endDateTime ? ` – ${fmt(slot.endDateTime)}` : ''}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.section>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────
export default function CalendarSection() {
  const [baseDate, setBaseDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [colorMap, setColorMap] = useState<Record<string, string>>({});
  const [externalDates, setExternalDates] = useState<Map<string, ExternalEventSlot[]>>(new Map());
  const [picker, setPicker] = useState<PickerState | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) setColorMap(JSON.parse(stored) as Record<string, string>);
    } catch {}
  }, []);

  function setEventColor(name: string, hex: string) {
    const next = { ...colorMap, [name]: hex };
    setColorMap(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  }
  function resetEventColor(name: string) {
    const next = { ...colorMap };
    delete next[name];
    setColorMap(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  }
  function openPicker(name: string, x: number, y: number) {
    setPicker({ name, x, y });
  }

  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const fetchEvents = useCallback(async () => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY;
    if (!apiKey) { setError('API 키 없음'); setLoading(false); return; }
    setLoading(true);
    setError(null);
    const fDow = new Date(year, month, 1).getDay();
    const dim = new Date(year, month + 1, 0).getDate();
    const nextOvf = Math.ceil((fDow + dim) / 7) * 7 - fDow - dim;
    const timeMin = (fDow > 0
      ? new Date(year, month - 1, new Date(year, month, 0).getDate() - fDow + 1)
      : new Date(year, month, 1)
    ).toISOString();
    const timeMax = (nextOvf > 0
      ? new Date(year, month + 1, nextOvf, 23, 59, 59)
      : new Date(year, month + 1, 0, 23, 59, 59)
    ).toISOString();
    try {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?key=${apiKey}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=200`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(body.error?.message ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as { items?: GoogleCalendarEvent[] };
      setEvents(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류 발생');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { void fetchEvents(); }, [fetchEvents]);

  const fetchExternalEvents = useCallback(async () => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY;
    if (!apiKey) return;
    const fDow = new Date(year, month, 1).getDay();
    const dim = new Date(year, month + 1, 0).getDate();
    const nextOvf = Math.ceil((fDow + dim) / 7) * 7 - fDow - dim;
    const timeMin = (fDow > 0
      ? new Date(year, month - 1, new Date(year, month, 0).getDate() - fDow + 1)
      : new Date(year, month, 1)
    ).toISOString();
    const timeMax = (nextOvf > 0
      ? new Date(year, month + 1, nextOvf, 23, 59, 59)
      : new Date(year, month + 1, 0, 23, 59, 59)
    ).toISOString();
    const dateMap = new Map<string, ExternalEventSlot[]>();
    await Promise.all(EXTERNAL_CALENDAR_IDS.map(async (calId) => {
      try {
        const encodedId = encodeURIComponent(calId);
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodedId}/events?key=${apiKey}&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&maxResults=200`,
        );
        if (!res.ok) return;
        const data = await res.json() as { items?: GoogleCalendarEvent[] };
        for (const event of data.items ?? []) {
          const dateKey = getStartDate(event);
          if (!dateKey) continue;
          const slot: ExternalEventSlot = {
            allDay: !!event.start.date,
            startDateTime: event.start.dateTime,
            endDateTime: event.end.dateTime,
          };
          const existing = dateMap.get(dateKey) ?? [];
          existing.push(slot);
          dateMap.set(dateKey, existing);
        }
      } catch {}
    }));
    setExternalDates(new Map(dateMap));
  }, [year, month]);

  useEffect(() => { void fetchExternalEvents(); }, [fetchExternalEvents]);

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  type CellData = { day: number; overflow?: 'prev' | 'next' };
  const cells: CellData[] = [];
  for (let i = firstDow - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, overflow: 'prev' });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextDay++, overflow: 'next' });
  }

  const eventsByDate = new Map<string, GoogleCalendarEvent[]>();
  for (const event of events) {
    const dateKey = getStartDate(event);
    if (!dateKey) continue;
    const bucket = eventsByDate.get(dateKey) ?? [];
    bucket.push(event);
    eventsByDate.set(dateKey, bucket);
  }

  const today = new Date();
  const isThisMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDay = isThisMonth ? today.getDate() : null;

  function goToMonth(y: number, m: number, d: number | null = null) {
    setSelectedDay(d);
    setBaseDate(new Date(y, m, 1));
  }
  function prevMonth() { goToMonth(year, month - 1); }
  function nextMonth() { goToMonth(year, month + 1); }

  return (
    <main className="afterroll-desk min-h-screen px-[1.1rem] pb-[4rem] pt-[5rem] text-[var(--ledger-ink)] md:px-[2rem]">
      <div className="mx-auto max-w-[72rem]">

        {/* 달력 */}
        <section className="ledger-paper-sheet paper-grid relative overflow-hidden rounded-[1.2rem]">
          <span className="afterroll-tape afterroll-tape-yellow right-[4rem] rotate-[6deg]" />

          {/* 월 네비게이션 */}
          <div className="relative z-[1] flex items-center justify-between px-[1.2rem] py-[1rem] md:px-[1.8rem] md:py-[1.3rem]">
            <motion.button type="button" onClick={prevMonth} whileTap={{ scale: 0.9 }}
              className="ledger-paper-panel ledger-dashed afterroll-note rounded-[0.5rem] px-[0.9rem] py-[0.42rem] text-[1rem] text-[var(--ledger-muted)] transition-transform hover:-translate-y-[0.03rem]">
              ←
            </motion.button>
            <div className="text-center">
              <p className="afterroll-title text-[2.6rem] leading-none text-[var(--ledger-ink)] md:text-[3.2rem]">{month + 1}월</p>
              <p className="afterroll-meta mt-[0.15rem] text-[0.78rem] uppercase tracking-[0.16em] text-[var(--ledger-soft)]">{year}</p>
            </div>
            <motion.button type="button" onClick={nextMonth} whileTap={{ scale: 0.9 }}
              className="ledger-paper-panel ledger-dashed afterroll-note rounded-[0.5rem] px-[0.9rem] py-[0.42rem] text-[1rem] text-[var(--ledger-muted)] transition-transform hover:-translate-y-[0.03rem]">
              →
            </motion.button>
          </div>

          {/* 요일 헤더 */}
          <div className="relative z-[1] grid grid-cols-7 border-y border-[rgba(87,67,48,0.1)]">
            {DAYS.map((day, i) => (
              <div key={day}
                className={`afterroll-meta py-[0.5rem] text-center text-[0.75rem] uppercase tracking-[0.08em] ${
                  i === 0 ? 'text-[rgba(192,57,43,0.6)]' : i === 6 ? 'text-[var(--ledger-accent-soft)]' : 'text-[var(--ledger-soft)]'
                }`}>
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 셀 */}
          {loading ? (
            <div className="relative z-[1] grid grid-cols-7">
              {Array.from({ length: 35 }, (_, i) => (
                <div key={i} className="min-h-[5rem] animate-pulse border-b border-r border-[rgba(87,67,48,0.07)] bg-white/40 p-[0.4rem] md:min-h-[7.5rem]">
                  <div className="h-[1.1rem] w-[1.4rem] rounded bg-[rgba(87,67,48,0.07)]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="relative z-[1] py-[3rem] text-center">
              <p className="afterroll-meta text-[0.88rem] text-[var(--ledger-soft)]">⚠ {error}</p>
            </div>
          ) : (
            <div className="relative z-[1] grid grid-cols-7">
              {cells.map((cell, index) => {
                const { day, overflow } = cell;
                const isSun = index % 7 === 0;
                const isSat = index % 7 === 6;

                if (overflow) {
                  const ovfDateKey = toDateKey(year, overflow === 'prev' ? month - 1 : month + 1, day);
                  const ovfItems = mergeCellItems(
                    eventsByDate.get(ovfDateKey) ?? [],
                    externalDates.get(ovfDateKey) ?? [],
                  );
                  return (
                    <div
                      key={`${overflow}-${day}`}
                      onClick={() => overflow === 'prev' ? goToMonth(year, month - 1, day) : goToMonth(year, month + 1, day)}
                      className="relative min-h-[5rem] cursor-pointer border-b border-r border-[rgba(87,67,48,0.07)] bg-[rgba(245,240,230,0.35)] p-[0.35rem] transition-colors duration-150 hover:bg-[rgba(245,240,230,0.55)] md:min-h-[7.5rem] md:p-[0.55rem]"
                    >
                      <span className={`afterroll-meta inline-flex h-[1.45rem] w-[1.45rem] items-center justify-center rounded-full text-[0.78rem] md:text-[0.85rem] ${
                        isSun ? 'text-[rgba(192,57,43,0.22)]'
                        : isSat ? 'text-[rgba(127,79,42,0.22)]'
                        : 'text-[rgba(87,67,48,0.22)]'
                      }`}>
                        {day}
                      </span>

                      {/* 데스크톱: 이벤트 칩 (흐릿하게) */}
                      <div className="mt-[0.25rem] hidden flex-col gap-[0.18rem] opacity-40 md:flex">
                        {ovfItems.slice(0, 3).map((item, i) => {
                          if (item.kind === 'mine') {
                            const color = resolveColor(item.event.summary, colorMap);
                            const timeStr = !isAllDay(item.event) && item.event.start.dateTime ? fmt(item.event.start.dateTime) : '';
                            return (
                              <div key={item.event.id} className="flex min-w-0 items-center gap-[0.22rem] overflow-hidden rounded-[0.25rem] px-[0.3rem] py-[0.1rem]"
                                style={{ background: color.bg, borderLeft: `0.18rem solid ${color.base}` }}>
                                {timeStr && <span className="afterroll-meta shrink-0 text-[0.58rem] leading-none" style={{ color: color.base }}>{timeStr}</span>}
                                <span className="afterroll-meta truncate text-[0.65rem] leading-[1.3] text-[var(--ledger-ink)]">{item.event.summary}</span>
                              </div>
                            );
                          }
                          const timeStr = !item.slot.allDay && item.slot.startDateTime ? fmt(item.slot.startDateTime) : '';
                          return (
                            <div key={`ext-${i}`} className="flex min-w-0 items-center gap-[0.22rem] overflow-hidden rounded-[0.25rem] px-[0.3rem] py-[0.1rem]"
                              style={{ background: 'rgba(87,67,48,0.04)', borderLeft: '0.18rem dashed rgba(87,67,48,0.2)' }}>
                              {timeStr && <span className="afterroll-meta shrink-0 text-[0.58rem] leading-none text-[rgba(87,67,48,0.4)]">{timeStr}</span>}
                              <span className="afterroll-meta truncate text-[0.65rem] leading-[1.3] text-[var(--ledger-soft)]">일정있음</span>
                            </div>
                          );
                        })}
                        {ovfItems.length > 3 && (
                          <span className="afterroll-meta text-[0.6rem] text-[var(--ledger-soft)]">+{ovfItems.length - 3}개</span>
                        )}
                      </div>

                      {/* 모바일: 컬러 도트 (흐릿하게) */}
                      {ovfItems.length > 0 && (
                        <div className="mt-[0.2rem] flex gap-[0.18rem] opacity-40 md:hidden">
                          {ovfItems.slice(0, 5).map((item, i) => {
                            if (item.kind === 'mine') {
                              const color = resolveColor(item.event.summary, colorMap);
                              return <span key={item.event.id} className="h-[0.32rem] w-[0.32rem] rounded-full" style={{ background: color.base }} />;
                            }
                            return <span key={`ext-${i}`} className="h-[0.32rem] w-[0.32rem] rounded-full bg-[rgba(87,67,48,0.35)]" />;
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const dateKey = toDateKey(year, month, day);
                const dayItems = mergeCellItems(
                  eventsByDate.get(dateKey) ?? [],
                  externalDates.get(dateKey) ?? [],
                );
                const isToday = todayDay === day;
                const isSelected = selectedDay === day;

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`relative min-h-[5rem] cursor-pointer border-b border-r border-[rgba(87,67,48,0.07)] p-[0.35rem] transition-colors duration-150 md:min-h-[7.5rem] md:p-[0.55rem] ${
                      isSelected ? 'bg-[rgba(127,79,42,0.07)]' : 'bg-white/80 hover:bg-[rgba(127,79,42,0.03)]'
                    }`}
                  >
                    {/* 날짜 숫자 */}
                    <span className={`afterroll-meta inline-flex h-[1.45rem] w-[1.45rem] items-center justify-center rounded-full text-[0.78rem] md:text-[0.85rem] ${
                      isSelected ? 'bg-[var(--ledger-accent)] text-[#f5ead4]'
                      : isToday ? 'bg-[rgba(127,79,42,0.18)] font-bold text-[var(--ledger-accent)]'
                      : isSun ? 'text-[rgba(192,57,43,0.65)]'
                      : isSat ? 'text-[var(--ledger-accent-soft)]'
                      : 'text-[var(--ledger-ink)]'
                    }`}>
                      {day}
                    </span>

                    {/* 데스크톱: 이벤트 칩 */}
                    <div className="mt-[0.25rem] hidden flex-col gap-[0.18rem] md:flex">
                      {dayItems.slice(0, 3).map((item, i) => {
                        if (item.kind === 'mine') {
                          const color = resolveColor(item.event.summary, colorMap);
                          const timeStr = !isAllDay(item.event) && item.event.start.dateTime ? fmt(item.event.start.dateTime) : '';
                          return (
                            <button key={item.event.id} type="button"
                              onClick={e => { e.stopPropagation(); openPicker(item.event.summary, e.clientX, e.clientY); }}
                              className="flex min-w-0 cursor-pointer items-center gap-[0.22rem] overflow-hidden rounded-[0.25rem] px-[0.3rem] py-[0.1rem] text-left transition-opacity hover:opacity-75"
                              style={{ background: color.bg, borderLeft: `0.18rem solid ${color.base}` }}>
                              {timeStr && <span className="afterroll-meta shrink-0 text-[0.58rem] leading-none" style={{ color: color.base }}>{timeStr}</span>}
                              <span className="afterroll-meta truncate text-[0.65rem] leading-[1.3] text-[var(--ledger-ink)]">{item.event.summary}</span>
                            </button>
                          );
                        }
                        const timeStr = !item.slot.allDay && item.slot.startDateTime ? fmt(item.slot.startDateTime) : '';
                        return (
                          <div key={`ext-${i}`} className="flex min-w-0 items-center gap-[0.22rem] overflow-hidden rounded-[0.25rem] px-[0.3rem] py-[0.1rem]"
                            style={{ background: 'rgba(87,67,48,0.05)', borderLeft: '0.18rem dashed rgba(87,67,48,0.22)' }}>
                            {timeStr && <span className="afterroll-meta shrink-0 text-[0.58rem] leading-none text-[rgba(87,67,48,0.4)]">{timeStr}</span>}
                            <span className="afterroll-meta truncate text-[0.65rem] leading-[1.3] text-[var(--ledger-soft)]">일정있음</span>
                          </div>
                        );
                      })}
                      {dayItems.length > 3 && (
                        <span className="afterroll-meta text-[0.6rem] text-[var(--ledger-soft)]">+{dayItems.length - 3}개</span>
                      )}
                    </div>

                    {/* 모바일: 컬러 도트 */}
                    {dayItems.length > 0 && (
                      <div className="mt-[0.2rem] flex gap-[0.18rem] md:hidden">
                        {dayItems.slice(0, 5).map((item, i) => {
                          if (item.kind === 'mine') {
                            const color = resolveColor(item.event.summary, colorMap);
                            return <span key={item.event.id} className="h-[0.32rem] w-[0.32rem] rounded-full" style={{ background: color.base }} />;
                          }
                          return <span key={`ext-${i}`} className="h-[0.32rem] w-[0.32rem] rounded-full bg-[rgba(87,67,48,0.3)]" />;
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 일별 스케줄 */}
        <AnimatePresence>
          {selectedDay !== null && (
            <DailyTimeline
              events={eventsByDate.get(toDateKey(year, month, selectedDay)) ?? []}
              day={selectedDay}
              month={month}
              year={year}
              colorMap={colorMap}
              onOpenPicker={openPicker}
              externalSlots={externalDates.get(toDateKey(year, month, selectedDay)) ?? []}
            />
          )}
        </AnimatePresence>
      </div>

      {/* 컬러 피커 — fixed 풀스크린 오버레이 + absolute 피커 */}
      <Portal>
        <AnimatePresence>
          {picker && (
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 9999, cursor: 'default' }}
              onClick={() => setPicker(null)}
            >
              <ColorPickerContent
                picker={picker}
                colorMap={colorMap}
                onSelect={(name, hex) => setEventColor(name, hex)}
                onReset={resetEventColor}
                onClose={() => setPicker(null)}
              />
            </div>
          )}
        </AnimatePresence>
      </Portal>
    </main>
  );
}
