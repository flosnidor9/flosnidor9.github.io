"use client";

/* eslint-disable @next/next/no-img-element */
import {
  ChangeEvent,
  PointerEvent,
  WheelEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import type { Character, CharacterLink } from "@/lib/data/characters";
import { characterImagePaths, characterStickerPaths, uploadCharacter } from "@/lib/characterUpload";
import { savePrivateCharacterLinks } from '@/lib/data/firebasePrivateCharacterLinks';
import CharacterSessionSelector from '@/components/characters/CharacterSessionSelector';

const OUTPUT_SIZE = 1024;
const MAX_ZOOM = 3;
type Crop = { x: number; y: number; zoom: number };
type Profile = {
  name: string;
  alias: string;
  catchphrase: string;
  age: string;
  gender: string;
  heightWeight: string;
  occupation: string;
  species: string;
  personality: string;
};
const EMPTY: Profile = {
  name: "",
  alias: "",
  catchphrase: "",
  age: "",
  gender: "",
  heightWeight: "",
  occupation: "",
  species: "",
  personality: "",
};
const DEFAULT_CROP: Crop = { x: 0, y: 0, zoom: 1 };
const DEFAULT_STICKER_SIZE = 1;
const STICKER_SIZE_MIN = 0.5;
const STICKER_SIZE_MAX = 1.8;
const STICKER_SIZE_STEP = 0.1;
const clamp = (value: number) => Math.max(-1, Math.min(1, value));

async function cropPortrait(file: File, crop: Crop) {
  const image = new Image();
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error("선택한 이미지를 읽을 수 없습니다."));
      image.src = url;
    });
    const size = Math.min(image.naturalWidth, image.naturalHeight) / crop.zoom;
    const x = Math.max(
      0,
      Math.min(
        image.naturalWidth - size,
        ((image.naturalWidth - size) / 2) * (1 + crop.x),
      ),
    );
    const y = Math.max(
      0,
      Math.min(
        image.naturalHeight - size,
        ((image.naturalHeight - size) / 2) * (1 + crop.y),
      ),
    );
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("이미지를 자를 수 없습니다.");
    context.drawImage(image, x, y, size, size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("이미지를 만들지 못했습니다.")),
        "image/webp",
        0.9,
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

function CropPreview({
  file,
  crop,
  onCropChange,
}: {
  file: File;
  crop: Crop;
  onCropChange: (crop: Crop) => void;
}) {
  const [src, setSrc] = useState("");
  const [size, setSize] = useState({ width: 0, height: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; crop: Crop } | null>(null);
  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setSrc(String(reader.result));
    reader.readAsDataURL(file);
    return () => reader.abort();
  }, [file]);
  const landscape = size.width >= size.height;
  const frameW = size.width
    ? landscape
      ? ((size.height / size.width) * 100) / crop.zoom
      : 100 / crop.zoom
    : 100;
  const frameH = size.height
    ? landscape
      ? 100 / crop.zoom
      : ((size.width / size.height) * 100) / crop.zoom
    : 100;
  const left = ((crop.x + 1) / 2) * (100 - frameW);
  const top = ((crop.y + 1) / 2) * (100 - frameH);
  function move(event: PointerEvent<HTMLDivElement>) {
    const origin = start.current;
    const rect = stage.current?.getBoundingClientRect();
    if (!origin || !rect) return;
    const roomX = rect.width * (1 - frameW / 100);
    const roomY = rect.height * (1 - frameH / 100);
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    const newCrop = { ...origin.crop };
    if (roomX > 0) newCrop.x = clamp(origin.crop.x + dx / (roomX / 2));
    if (roomY > 0) newCrop.y = clamp(origin.crop.y + dy / (roomY / 2));
    onCropChange(newCrop);
  }
  function zoomAt(clientX: number, clientY: number, nextZoom: number) {
    const rect = stage.current?.getBoundingClientRect();
    if (!rect || !size.width || !size.height) return;
    const zoom = Math.max(1, Math.min(MAX_ZOOM, nextZoom));
    const oldSide = Math.min(size.width, size.height) / crop.zoom;
    const newSide = Math.min(size.width, size.height) / zoom;
    const oldLeft = ((size.width - oldSide) * (1 + crop.x)) / 2;
    const oldTop = ((size.height - oldSide) * (1 + crop.y)) / 2;
    const pointerX = ((clientX - rect.left) / rect.width) * size.width;
    const pointerY = ((clientY - rect.top) / rect.height) * size.height;
    const ratioX = (pointerX - oldLeft) / oldSide;
    const ratioY = (pointerY - oldTop) / oldSide;
    const newLeft = Math.max(
      0,
      Math.min(size.width - newSide, pointerX - ratioX * newSide),
    );
    const newTop = Math.max(
      0,
      Math.min(size.height - newSide, pointerY - ratioY * newSide),
    );
    onCropChange({
      x:
        size.width === newSide
          ? 0
          : clamp((newLeft / (size.width - newSide)) * 2 - 1),
      y:
        size.height === newSide
          ? 0
          : clamp((newTop / (size.height - newSide)) * 2 - 1),
      zoom,
    });
  }
  function onWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    zoomAt(
      event.clientX,
      event.clientY,
      crop.zoom + (event.deltaY < 0 ? 0.1 : -0.1),
    );
  }
  return (
    <section>
      <div className="mb-[0.35rem] flex justify-between gap-[0.5rem]">
        <p className="pc-field-label mb-0">1:1 외형 크롭</p>
        <p className="afterroll-meta text-[0.68rem] text-[var(--atr-soft)]">
          드래그·휠로 위치와 확대를 조절하세요
        </p>
      </div>
      <div className="pc-upload-zone flex justify-center p-[0.4rem]">
        <div
          ref={stage}
          className="relative touch-none select-none overflow-hidden bg-[rgba(200,121,147,0.14)]"
          style={{
            width:
              size.width && !landscape
                ? `${Math.min(24, (24 * size.width) / size.height)}rem`
                : "100%",
            maxWidth: "100%",
          }}
          onWheel={onWheel}
          onPointerMove={move}
          onPointerUp={() => {
            start.current = null;
          }}
          onPointerCancel={() => {
            start.current = null;
          }}
        >
          {src && (
            <img
              src={src}
              alt="선택한 외형 원본 미리보기"
              className="block h-auto w-full"
              draggable={false}
              onLoad={(event) =>
                setSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })
              }
            />
          )}
          {size.width > 0 && (
            <div
              className="pc-crop-frame absolute cursor-grab border-[0.12rem] border-white active:cursor-grabbing"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${frameW}%`,
                height: `${frameH}%`,
              }}
              onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                start.current = { x: event.clientX, y: event.clientY, crop };
              }}
            />
          )}
        </div>
      </div>
      <label className="mt-[0.55rem] block">
        <span className="pc-field-label">
          확대 <output className="ml-[0.25rem]">{crop.zoom.toFixed(1)}×</output>
        </span>
        <input
          className="w-full accent-[var(--atr-muted)]"
          type="range"
          min="1"
          max={MAX_ZOOM}
          step="0.1"
          value={crop.zoom}
          onChange={(event) =>
            zoomAt(
              (stage.current?.getBoundingClientRect().left ?? 0) +
                (stage.current?.clientWidth ?? 0) / 2,
              (stage.current?.getBoundingClientRect().top ?? 0) +
                (stage.current?.clientHeight ?? 0) / 2,
              Number(event.target.value),
            )
          }
        />
      </label>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="pc-field-label">{label}</span>
      <input
        className="pc-field"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default function CharacterUploadButton() {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [crop, setCrop] = useState(DEFAULT_CROP);
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [links, setLinks] = useState<CharacterLink[]>([]);
  const [privateLinks, setPrivateLinks] = useState<CharacterLink[]>([]);
  const [stickerFiles, setStickerFiles] = useState<File[]>([]);
  const [stickerSizes, setStickerSizes] = useState<number[]>([]);
  const stickerInput = useRef<HTMLInputElement>(null);
  const [sessionKeys, setSessionKeys] = useState<string[]>([]);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (key: keyof Profile) => (value: string) =>
    setProfile((current) => ({ ...current, [key]: value }));
  const addStickers = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length) {
      setStickerFiles((current) => [...current, ...selectedFiles]);
      setStickerSizes((current) => [...current, ...selectedFiles.map(() => DEFAULT_STICKER_SIZE)]);
    }
    event.target.value = '';
  };
  if (!isAdmin) return null;
  async function submit() {
    if (!file || !profile.name.trim() || !token.trim()) return;
    setSaving(true);
    setStatus("원본·외형·기록을 저장소에 올리는 중…");
    try {
      const id = `${
        profile.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "character"
      }-${Date.now()}`;
      const now = new Date().toISOString();
      const character: Character = {
        id,
        ...profile,
        linkItems: links.filter((link) => link.name.trim() && link.url.trim()),
        stickers: characterStickerPaths(id, stickerFiles).map((sticker, index) => ({ ...sticker, size: stickerSizes[index] ?? DEFAULT_STICKER_SIZE })),
        links: {},
        portrait: { ...characterImagePaths(id, file.name), crop },
        sessionKeys,
        createdAt: now,
        updatedAt: now,
      };
      await uploadCharacter(
        token.trim(),
        character,
        file,
        await cropPortrait(file, crop),
        stickerFiles,
      );
      await savePrivateCharacterLinks(id, privateLinks);
      setStatus("올리기가 완료됐습니다. 배포가 시작됩니다.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "업로드 중 오류가 발생했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <button
        type="button"
        className="pc-primary-button"
        onClick={() => setOpen(true)}
      >
        + 캐릭터 등록
      </button>
      {open &&
        createPortal(
          <AnimatePresence>
            <div className="fixed inset-0 z-[100] overflow-y-auto bg-[rgba(76,51,61,0.34)] p-[0.7rem] backdrop-blur-[0.25rem]">
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 18 }}
                className="pc-composer mx-auto my-[1rem] w-full max-w-[38rem] overflow-hidden"
              >
                <header className="flex items-center justify-between border-b border-[var(--atr-line)] px-[1.1rem] py-[0.9rem]">
                  <p className="afterroll-title text-[1.35rem] text-[var(--atr-text)]">
                    새 캐릭터 등록
                  </p>
                  <button
                    type="button"
                    className="afterroll-meta text-[0.8rem] text-[var(--atr-muted)]"
                    onClick={() => setOpen(false)}
                  >
                    닫기
                  </button>
                </header>
                <div className="space-y-[1rem] px-[1.1rem] py-[1rem]">
                  <div>
                    <p className="pc-field-label">외형 원본</p>
                    <div className="flex items-center gap-[0.6rem]">
                      <label
                        htmlFor="character-portrait-file"
                        className="pc-primary-button cursor-pointer"
                      >
                        파일 선택
                      </label>
                      <span className="min-w-0 truncate text-[0.78rem] text-[var(--atr-muted)]">
                        {file?.name ?? "선택된 파일 없음"}
                      </span>
                      <input
                        id="character-portrait-file"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                          setFile(event.target.files?.[0] ?? null);
                          setCrop(DEFAULT_CROP);
                        }}
                      />
                    </div>
                  </div>
                  {file && (
                    <CropPreview
                      file={file}
                      crop={crop}
                      onCropChange={setCrop}
                    />
                  )}
                  <section>
                    <div className="mb-[0.45rem] flex items-center justify-between gap-[0.75rem]">
                      <div>
                        <p className="pc-field-label mb-0">스티커</p>
                        <p className="afterroll-meta mt-[0.15rem] text-[0.68rem] text-[var(--atr-soft)]">상세 카드의 가장자리에 붙습니다.</p>
                      </div>
                      <button type="button" className="pc-link" onClick={() => stickerInput.current?.click()}>
                        + 스티커 추가
                      </button>
                      <input ref={stickerInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" multiple className="sr-only" onChange={addStickers} />
                    </div>
                    {stickerFiles.length > 0 && <ul className="space-y-[0.5rem]" aria-label="추가할 스티커">
                      {stickerFiles.map((sticker, index) => <li key={`${sticker.name}-${index}`} className="border-b border-dashed border-[var(--atr-line)] pb-[0.45rem] afterroll-meta text-[0.72rem] text-[var(--atr-muted)]"><div className="flex items-center justify-between gap-[0.75rem]"><span className="truncate">{sticker.name}</span><button type="button" className="pc-link shrink-0" onClick={() => { setStickerFiles((current) => current.filter((_, itemIndex) => itemIndex !== index)); setStickerSizes((current) => current.filter((_, itemIndex) => itemIndex !== index)); }}>제거</button></div><label className="mt-[0.3rem] flex items-center gap-[0.5rem]"><span className="shrink-0 text-[var(--atr-soft)]">크기 {Math.round((stickerSizes[index] ?? DEFAULT_STICKER_SIZE) * 100)}%</span><input className="w-full accent-[var(--atr-accent)]" type="range" min={STICKER_SIZE_MIN} max={STICKER_SIZE_MAX} step={STICKER_SIZE_STEP} value={stickerSizes[index] ?? DEFAULT_STICKER_SIZE} onChange={(event) => setStickerSizes((current) => current.map((size, itemIndex) => itemIndex === index ? Number(event.target.value) : size))} aria-label={`${sticker.name} 스티커 크기`} /></label></li>)}
                    </ul>}
                  </section>
                  <div className="grid gap-[0.75rem] sm:grid-cols-2">
                    <Field
                      label="이름 *"
                      value={profile.name}
                      onChange={set("name")}
                    />
                    <Field
                      label="별칭"
                      value={profile.alias}
                      onChange={set("alias")}
                    />
                    <Field
                      label="나이"
                      value={profile.age}
                      onChange={set("age")}
                    />
                    <Field
                      label="성별"
                      value={profile.gender}
                      onChange={set("gender")}
                    />
                    <Field
                      label="키 / 몸무게"
                      value={profile.heightWeight}
                      onChange={set("heightWeight")}
                    />
                    <Field
                      label="직업"
                      value={profile.occupation}
                      onChange={set("occupation")}
                    />
                    <Field
                      label="종족"
                      value={profile.species}
                      onChange={set("species")}
                    />
                    <Field
                      label="캐치프레이즈"
                      value={profile.catchphrase}
                      onChange={set("catchphrase")}
                    />
                  </div>
                  <section>
                    <div className="mb-[0.45rem] flex items-center justify-between gap-[0.75rem]">
                      <p className="pc-field-label mb-0">링크</p>
                      <button type="button" className="pc-link" onClick={() => setLinks((current) => [...current, { name: "", url: "" }])}>+ 링크 추가</button>
                    </div>
                    <div className="space-y-[0.5rem]">
                      {links.map((link, index) => <div key={index} className="grid gap-[0.5rem] sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
                        <input className="pc-field" value={link.name} onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="이름" aria-label={`링크 ${index + 1} 이름`} />
                        <input className="pc-field" type="url" value={link.url} onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} placeholder="https://..." aria-label={`링크 ${index + 1} 주소`} />
                        <button type="button" className="pc-link justify-self-end sm:self-center" onClick={() => setLinks((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`링크 ${index + 1} 삭제`}>삭제</button>
                      </div>)}
                    </div>
                  </section>
                  <section>
                    <div className="mb-[0.45rem] flex items-center justify-between gap-[0.75rem]">
                      <div>
                        <p className="pc-field-label mb-0">비공개 링크</p>
                        <p className="afterroll-meta mt-[0.15rem] text-[0.68rem] text-[var(--atr-soft)]">관리자 로그인 시에만 표시됩니다.</p>
                      </div>
                      <button type="button" className="pc-link" onClick={() => setPrivateLinks((current) => [...current, { name: "", url: "" }])}>+ 링크 추가</button>
                    </div>
                    <div className="space-y-[0.5rem]">
                      {privateLinks.map((link, index) => <div key={index} className="grid gap-[0.5rem] sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
                        <input className="pc-field" value={link.name} onChange={(event) => setPrivateLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="이름" aria-label={`비공개 링크 ${index + 1} 이름`} />
                        <input className="pc-field" type="url" value={link.url} onChange={(event) => setPrivateLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} placeholder="https://..." aria-label={`비공개 링크 ${index + 1} 주소`} />
                        <button type="button" className="pc-link justify-self-end sm:self-center" onClick={() => setPrivateLinks((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`비공개 링크 ${index + 1} 삭제`}>삭제</button>
                      </div>)}
                    </div>
                  </section>
                  <CharacterSessionSelector value={sessionKeys} onChange={setSessionKeys} />
                  <label>
                    <span className="pc-field-label">성격</span>
                    <textarea
                      className="pc-field min-h-[5rem] resize-y"
                      value={profile.personality}
                      onChange={(event) =>
                        set("personality")(event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span className="pc-field-label">GitHub access token</span>
                    <input
                      className="pc-field"
                      type="password"
                      value={token}
                      onChange={(event) => setToken(event.target.value)}
                      autoComplete="off"
                      placeholder="fine-grained token (Contents: Read and write)"
                    />
                  </label>
                  {status && (
                    <p className="afterroll-meta text-[0.72rem] text-[var(--atr-muted)]">
                      {status}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={
                        !file || !profile.name.trim() || !token.trim() || saving
                      }
                      className="pc-primary-button"
                      onClick={() => void submit()}
                    >
                      {saving ? "올리는 중…" : "올리기"}
                    </button>
                  </div>
                </div>
              </motion.section>
            </div>
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
