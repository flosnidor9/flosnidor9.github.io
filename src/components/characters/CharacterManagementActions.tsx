"use client";

import { ChangeEvent, Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "@/components/ArchiveImage";
import type {
  Character,
  CharacterLink,
  CharacterSticker,
  CocCharacterData,
  InsaneCharacterData,
  ShinobigamiCharacterData,
} from "@/lib/data/characters";
import {
  characterStickerPaths,
  deleteCharacter,
  updateCharacter,
} from "@/lib/characterUpload";
import {
  savePrivateCharacterLinks,
  subscribeToPrivateCharacterLinks,
} from "@/lib/data/firebasePrivateCharacterLinks";
import { useAuth } from "@/contexts/AuthContext";
import CharacterSessionSelector from "@/components/characters/CharacterSessionSelector";
import { subscribeToPlaysOptions } from "@/lib/data/firebasePlays";
import {
  isCocRule,
  isInsaneRule,
  isShinobigamiRule,
  parseCocofoliaCharacter,
} from "@/lib/cocofoliaCharacter";

type EditableField =
  | "name"
  | "alias"
  | "catchphrase"
  | "age"
  | "gender"
  | "heightWeight"
  | "occupation"
  | "personality";
type Mode = "edit" | "delete" | null;

const DEFAULT_STICKER_SIZE = 1;
const STICKER_SIZE_MIN = 0.5;
const STICKER_SIZE_MAX = 1.8;
const STICKER_SIZE_STEP = 0.1;
const STICKER_PREVIEW_POSITIONS = [
  { left: "0%", top: "12%" },
  { left: "100%", top: "43%" },
  { left: "70%", top: "100%" },
  { left: "20%", top: "100%" },
  { left: "0%", top: "64%" },
] as const;

function StickerPreview({ stickers }: { stickers: CharacterSticker[] }) {
  return (
    <div className="relative mx-auto mt-[0.65rem] aspect-[4/3] w-full max-w-[18rem] rounded-[0.35rem] border border-dashed border-[var(--atr-line)] bg-[rgba(255,248,250,0.45)] p-[0.6rem]">
      <div className="h-full w-full rounded-[0.15rem] bg-[rgba(200,121,147,0.14)]" />
      {stickers.map((sticker, index) => {
        const position =
          STICKER_PREVIEW_POSITIONS[index % STICKER_PREVIEW_POSITIONS.length];
        const size = sticker.size ?? DEFAULT_STICKER_SIZE;
        return (
          <div
            key={`${sticker.src}-${index}`}
            className="pointer-events-none absolute"
            style={{
              ...position,
              width: `${3.2 * size}rem`,
              height: `${3.2 * size}rem`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <Image
              src={sticker.src}
              alt=""
              fill
              sizes="6rem"
              unoptimized
              className="object-contain drop-shadow-[0_0.18rem_0.2rem_rgba(91,48,64,0.2)]"
            />
          </div>
        );
      })}
      <p className="absolute bottom-[0.35rem] left-1/2 -translate-x-1/2 whitespace-nowrap afterroll-meta text-[0.62rem] text-[var(--atr-soft)]">
        상세 카드 미리보기
      </p>
    </div>
  );
}

const FIELDS: Array<{
  key: EditableField;
  label: string;
  placeholder?: string;
  multiline?: boolean;
}> = [
  { key: "name", label: "이름", placeholder: "예: 키요" },
  { key: "alias", label: "별칭", placeholder: "예: 레이" },
  { key: "age", label: "나이", placeholder: "예: 20" },
  { key: "gender", label: "성별", placeholder: "예: 여성" },
  { key: "heightWeight", label: "키 / 몸무게", placeholder: "예: 166cm/55kg" },
  { key: "occupation", label: "직업", placeholder: "예: 경찰보조 안드로이드" },
  { key: "catchphrase", label: "한마디", placeholder: "예: 무언가로 불리고 싶거든요," },
  { key: "personality", label: "성격", multiline: true },
];

function valuesFrom(character: Character) {
  return Object.fromEntries(
    FIELDS.map(({ key }) => [key, character[key] ?? ""]),
  ) as Record<EditableField, string>;
}

function RuleFields({
  characterId,
  rule,
  rules,
  onRuleChange,
  onImport,
}: {
  characterId: string;
  rule: string;
  rules: string[];
  onRuleChange: (rule: string) => void;
  onImport: () => void;
}) {
  return (
    <section>
      <label
        htmlFor={`character-rule-${characterId}`}
        className="pc-field-label"
      >
        룰
      </label>
      <select
        id={`character-rule-${characterId}`}
        value={rule}
        onChange={(event) => onRuleChange(event.target.value)}
        className="pc-field mt-[0.35rem] max-w-[16rem] rounded-full py-[0.42rem]"
      >
        <option value="">룰 선택</option>
        {rule && !rules.includes(rule) && <option value={rule}>{rule}</option>}
        {rules.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {(isCocRule(rule) || isShinobigamiRule(rule) || isInsaneRule(rule)) && (
        <div className="mt-[0.45rem] flex flex-wrap items-center gap-[0.55rem]">
          <button type="button" className="pc-link" onClick={onImport}>
            코코포리아 API 붙여넣기
          </button>
          <p className="afterroll-meta text-[0.68rem] text-[var(--atr-soft)]">
            클립보드의 캐릭터 API에서 이 룰에 필요한 항목을 불러옵니다.
          </p>
        </div>
      )}
    </section>
  );
}

function ImportedRuleDetails({
  coc,
  shinobigami,
  insane,
  showShinobigamiMetadata = true,
}: {
  coc?: CocCharacterData;
  shinobigami?: ShinobigamiCharacterData;
  insane?: InsaneCharacterData;
  showShinobigamiMetadata?: boolean;
}) {
  if (coc?.characteristics.length)
    return (
      <section className="rounded-[0.45rem] border border-dashed border-[var(--atr-line)] p-[0.7rem]">
        <p className="pc-field-label">특성치</p>
        <dl className="mt-[0.45rem] grid grid-cols-3 gap-x-[0.7rem] gap-y-[0.35rem] sm:grid-cols-5">
          {coc.characteristics.map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-[0.35rem]">
              <dt className="afterroll-meta text-[0.68rem] text-[var(--atr-soft)]">
                {stat.label}
              </dt>
              <dd className="afterroll-meta text-[0.75rem] text-[var(--atr-text)]">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    );
  if (shinobigami && (showShinobigamiMetadata || shinobigami.ninpo.length || shinobigami.secretArt))
    return (
      <section className="rounded-[0.45rem] border border-dashed border-[var(--atr-line)] p-[0.7rem]">
        {showShinobigamiMetadata && <><p className="pc-field-label">룰 정보</p>
        {([
          ["계급", shinobigami.rank],
          ["유파", shinobigami.faction],
          ["하위 유파", shinobigami.subfaction],
          ["신념", shinobigami.belief],
          ["신분", shinobigami.socialStatus],
        ] as const).some(([, value]) => value) && (
          <dl className="mt-[0.45rem] grid grid-cols-2 gap-x-[0.7rem] gap-y-[0.35rem]">
            {([
              ["계급", shinobigami.rank],
              ["유파", shinobigami.faction],
              ["하위 유파", shinobigami.subfaction],
              ["신념", shinobigami.belief],
              ["신분", shinobigami.socialStatus],
            ] as const).filter(([, value]) => value).map(([label, value]) => (
              <div key={label}><dt className="afterroll-meta text-[0.68rem] text-[var(--atr-soft)]">{label}</dt><dd className="afterroll-meta text-[0.75rem] text-[var(--atr-text)]">{value}</dd></div>
            ))}
          </dl>
        )}</>}
        {shinobigami.secretArt && (
          <p className="afterroll-meta text-[0.76rem] text-[var(--atr-muted)]">
            <span className="text-[var(--atr-soft)]">오의</span>{" "}
            {shinobigami.secretArt.name} · {shinobigami.secretArt.type}
          </p>
        )}
        {shinobigami.ninpo.length > 0 && (
          <div className={shinobigami.secretArt ? "mt-[0.55rem]" : ""}>
            <p className="pc-field-label">인법</p>
            <p className="afterroll-meta mt-[0.3rem] text-[0.72rem] leading-[1.6] text-[var(--atr-muted)]">
              {shinobigami.ninpo.join(" · ")}
            </p>
          </div>
        )}
      </section>
    );
  if (insane?.abilities.length)
    return (
      <section className="rounded-[0.45rem] border border-dashed border-[var(--atr-line)] p-[0.7rem]">
        <p className="pc-field-label">어빌리티</p>
        <p className="afterroll-meta mt-[0.3rem] text-[0.72rem] leading-[1.6] text-[var(--atr-muted)]">
          {insane.abilities.join(" · ")}
        </p>
      </section>
    );
  return null;
}

function ShinobigamiRuleFields({
  value,
  onChange,
}: {
  value?: ShinobigamiCharacterData;
  onChange: (value: ShinobigamiCharacterData) => void;
}) {
  const fields: Array<{ key: keyof Pick<ShinobigamiCharacterData, "rank" | "faction" | "subfaction" | "belief" | "socialStatus">; label: string }> = [
    { key: "rank", label: "계급" },
    { key: "faction", label: "유파" },
    { key: "subfaction", label: "하위 유파" },
    { key: "belief", label: "신념" },
    { key: "socialStatus", label: "신분" },
  ];
  return (
    <section className="rounded-[0.45rem] border border-dashed border-[var(--atr-line)] p-[0.7rem]">
      <p className="pc-field-label mb-[0.45rem]">룰 정보</p>
      <div className="grid gap-[0.65rem] sm:grid-cols-2">
        {fields.map(({ key, label }) => (
          <label key={key}><span className="pc-field-label">{label}</span><input className="pc-field" value={value?.[key] ?? ""} onChange={(event) => onChange({ ...(value ?? { ninpo: [] }), [key]: event.target.value })} /></label>
        ))}
      </div>
    </section>
  );
}

export default function CharacterManagementActions({
  character,
  onUpdated,
  onDeleted,
}: {
  character: Character;
  onUpdated: (character: Character) => void;
  onDeleted: () => void;
}) {
  const { isAdmin, loading } = useAuth();
  const [mode, setMode] = useState<Mode>(null);
  const [values, setValues] = useState(() => valuesFrom(character));
  const [rule, setRule] = useState(character.rule ?? "");
  const [rules, setRules] = useState<string[]>([]);
  const [color, setColor] = useState(character.color ?? "");
  const [coc, setCoc] = useState<CocCharacterData | undefined>(character.coc);
  const [shinobigami, setShinobigami] = useState<
    ShinobigamiCharacterData | undefined
  >(character.shinobigami);
  const [insane, setInsane] = useState<InsaneCharacterData | undefined>(
    character.insane,
  );
  const [links, setLinks] = useState<CharacterLink[]>(
    character.linkItems ?? [],
  );
  const [privateLinks, setPrivateLinks] = useState<CharacterLink[]>([]);
  const initialPrivateLinks = useRef<CharacterLink[]>([]);
  const [stickers, setStickers] = useState<CharacterSticker[]>(
    character.stickers ?? [],
  );
  const [stickerFiles, setStickerFiles] = useState<File[]>([]);
  const [stickerSizes, setStickerSizes] = useState<number[]>([]);
  const [stickerPreviews, setStickerPreviews] = useState<string[]>([]);
  const stickerInput = useRef<HTMLInputElement>(null);
  const [sessionKeys, setSessionKeys] = useState(character.sessionKeys);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!isAdmin) return;
    return subscribeToPrivateCharacterLinks(character.id, (nextLinks) => {
      initialPrivateLinks.current = nextLinks;
      setPrivateLinks(nextLinks);
    });
  }, [character.id, isAdmin]);
  useEffect(
    () => subscribeToPlaysOptions((options) => setRules(options.rules)),
    [],
  );
  useEffect(() => {
    const urls = stickerFiles.map((file) => URL.createObjectURL(file));
    setStickerPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [stickerFiles]);
  if (loading || !isAdmin) return null;

  const resetAndClose = () => {
    setMode(null);
    setToken("");
    setStatus("");
  };
  const close = () => {
    if (!saving) resetAndClose();
  };
  const resetEditForm = () => {
    setValues(valuesFrom(character));
    setRule(character.rule ?? "");
    setColor(character.color ?? "");
    setCoc(character.coc);
    setShinobigami(character.shinobigami);
    setInsane(character.insane);
    setLinks(character.linkItems ?? []);
    setPrivateLinks(initialPrivateLinks.current);
    setStickers(character.stickers ?? []);
    setStickerFiles([]);
    setStickerSizes([]);
    setSessionKeys(character.sessionKeys);
    setToken("");
    setStatus("");
    if (stickerInput.current) stickerInput.current.value = "";
  };
  const open = (nextMode: Exclude<Mode, null>) => {
    resetEditForm();
    setMode(nextMode);
  };
  const addStickers = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length) {
      setStickerFiles((current) => [...current, ...selectedFiles]);
      setStickerSizes((current) => [
        ...current,
        ...selectedFiles.map(() => DEFAULT_STICKER_SIZE),
      ]);
    }
    event.target.value = "";
  };
  const importCocofolia = async () => {
    try {
      const imported = parseCocofoliaCharacter(
        await navigator.clipboard.readText(),
        rule,
      );
      if (!imported) {
        setStatus("클립보드에 선택한 룰의 코코포리아 캐릭터 API가 없습니다.");
        return;
      }
      setValues((current) => ({
        ...current,
        name: imported.name || current.name,
        catchphrase: imported.catchphrase || current.catchphrase,
        age: imported.age || current.age,
        gender: imported.gender || current.gender,
        heightWeight: imported.heightWeight || current.heightWeight,
        occupation: imported.occupation || current.occupation,
        personality: imported.setting || current.personality,
      }));
      setColor(imported.color || color);
      setCoc(imported.coc);
      setShinobigami(imported.shinobigami);
      setInsane(imported.insane);
      setStatus("코코포리아 API에서 필요한 항목을 불러왔습니다.");
    } catch {
      setStatus("클립보드를 읽을 수 없습니다. 브라우저 권한을 확인해 주세요.");
    }
  };
  const save = async () => {
    if (!values.name.trim() || !token.trim()) return;
    setSaving(true);
    setStatus("수정 내용을 저장하는 중…");
    try {
      const newStickers = characterStickerPaths(character.id, stickerFiles).map(
        (sticker, index) => ({
          ...sticker,
          size: stickerSizes[index] ?? DEFAULT_STICKER_SIZE,
        }),
      );
      const nextCharacter: Character = {
        ...character,
        ...values,
        name: values.name.trim(),
        rule,
        color,
        coc,
        shinobigami,
        insane,
        linkItems: links.filter((link) => link.name.trim() && link.url.trim()),
        stickers: [...stickers, ...newStickers],
        sessionKeys,
        updatedAt: new Date().toISOString(),
      };
      await updateCharacter(
        token.trim(),
        nextCharacter,
        stickerFiles,
        newStickers,
      );
      await savePrivateCharacterLinks(character.id, privateLinks);
      onUpdated(nextCharacter);
      resetAndClose();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "수정 중 오류가 발생했습니다.",
      );
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!token.trim()) return;
    setSaving(true);
    setStatus("캐릭터를 삭제하는 중…");
    try {
      await deleteCharacter(token.trim(), character);
      onDeleted();
      resetAndClose();
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "삭제 중 오류가 발생했습니다.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className="absolute bottom-[0.7rem] right-[0.75rem] z-[5] flex gap-[0.4rem] opacity-100 transition-opacity duration-200 sm:pointer-events-none sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100 sm:group-focus-within:pointer-events-auto sm:group-focus-within:opacity-100"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="bg-transparent p-0 text-[0.68rem]"
          style={{ color: "rgb(88 61 70)" }}
          onClick={() => open("edit")}
        >
          수정
        </button>
        <button
          type="button"
          className="bg-transparent p-0 text-[0.68rem] drop-shadow-[0_0.06rem_0.16rem_rgba(0,0,0,0.7)]"
          style={{ color: "rgb(196 92 108)" }}
          onClick={() => open("delete")}
        >
          삭제
        </button>
      </div>
      {mode &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-[rgba(76,51,61,0.38)] p-[0.7rem] backdrop-blur-[0.25rem]"
            onClick={close}
          >
            <section
              className="pc-composer max-h-[90vh] w-full max-w-[38rem] overflow-y-auto"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="flex items-center justify-between border-b border-[var(--atr-line)] px-[1.1rem] py-[0.9rem]">
                <p className="afterroll-title text-[1.35rem] text-[var(--atr-text)]">
                  {mode === "edit" ? "캐릭터 수정" : "캐릭터 삭제"}
                </p>
                <button
                  type="button"
                  className="afterroll-meta text-[0.8rem] text-[var(--atr-muted)]"
                  onClick={close}
                >
                  닫기
                </button>
              </header>
              <div className="space-y-[0.8rem] px-[1.1rem] py-[1rem]">
                {mode === "edit" ? (
                  <>
                    <RuleFields
                      characterId={character.id}
                      rule={rule}
                      rules={rules}
                      onRuleChange={(nextRule) => {
                        setRule(nextRule);
                        setCoc(undefined);
                        setShinobigami(undefined);
                        setInsane(undefined);
                        setStatus("");
                      }}
                      onImport={() => void importCocofolia()}
                    />
                    <section>
                      <p className="pc-field-label mb-[0.45rem]">기본 프로필</p>
                    <div className="grid gap-[0.65rem] sm:grid-cols-2">
                      {FIELDS.map(({ key, label, placeholder, multiline }) => (
                        <Fragment key={key}>
                          <label className={multiline ? "sm:col-span-2" : undefined}>
                            <span className="pc-field-label">
                              {label}
                              {key === "name" ? " *" : ""}
                            </span>
                            {multiline ? (
                              <textarea
                                className="pc-field min-h-[5rem] resize-y"
                                value={values[key]}
                                onChange={(event) =>
                                  setValues((current) => ({
                                    ...current,
                                    [key]: event.target.value,
                                  }))
                                }
                              />
                            ) : (
                              <input
                                className="pc-field"
                                value={values[key]}
                                placeholder={placeholder}
                                onChange={(event) =>
                                  setValues((current) => ({
                                    ...current,
                                    [key]: event.target.value,
                                  }))
                                }
                              />
                            )}
                          </label>
                          {key === "catchphrase" && <label><span className="pc-field-label">Color</span><input className="pc-field" value={color} onChange={(event) => setColor(event.target.value)} placeholder="#FFC0CB" /></label>}
                        </Fragment>
                      ))}
                    </div>
                    </section>
                    {isShinobigamiRule(rule) && <ShinobigamiRuleFields value={shinobigami} onChange={setShinobigami} />}
                  </>
                ) : (
                  <p className="afterroll-body text-[0.9rem] text-[var(--atr-muted)]">
                    “{character.name}”을(를) 목록에서 삭제합니다. 이미지 파일은
                    보관소에 남고, 공개 목록에서만 제거됩니다.
                  </p>
                )}
                {mode === "edit" && (
                  <ImportedRuleDetails
                    coc={coc}
                    shinobigami={shinobigami}
                    insane={insane}
                    showShinobigamiMetadata={!isShinobigamiRule(rule)}
                  />
                )}
                {false && mode === "edit" && (
                  <section>
                    <label
                      htmlFor={`character-rule-${character.id}`}
                      className="pc-field-label"
                    >
                      룰
                    </label>
                    <select
                      id={`character-rule-${character.id}`}
                      value={rule}
                      onChange={(event) => {
                        setRule(event.target.value);
                        setCoc(undefined);
                        setShinobigami(undefined);
                        setInsane(undefined);
                        setStatus("");
                      }}
                      className="pc-field mt-[0.35rem] max-w-[16rem] rounded-full py-[0.42rem]"
                    >
                      <option value="">룰 선택</option>
                      {rule && !rules.includes(rule) && (
                        <option value={rule}>{rule}</option>
                      )}
                      {rules.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {(isCocRule(rule) ||
                      isShinobigamiRule(rule) ||
                      isInsaneRule(rule)) && (
                      <div className="mt-[0.45rem] flex flex-wrap items-center gap-[0.55rem]">
                        <button
                          type="button"
                          className="pc-link"
                          onClick={() => void importCocofolia()}
                        >
                          코코포리아 API 붙여넣기
                        </button>
                        <p className="afterroll-meta text-[0.68rem] text-[var(--atr-soft)]">
                          클립보드의 캐릭터 API에서 이 룰에 필요한 항목을
                          불러옵니다.
                        </p>
                      </div>
                    )}
                  </section>
                )}
                {mode === "edit" && (
                  <section>
                    <div className="mb-[0.45rem] flex items-center justify-between gap-[0.75rem]">
                      <div>
                        <p className="pc-field-label mb-0">스티커</p>
                        <p className="afterroll-meta mt-[0.15rem] text-[0.68rem] text-[var(--atr-soft)]">
                          미리보기를 보며 상세 카드에서의 크기를 조절할 수
                          있습니다.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="pc-link"
                        onClick={() => stickerInput.current?.click()}
                      >
                        + 스티커 추가
                      </button>
                      <input
                        ref={stickerInput}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                        multiple
                        className="sr-only"
                        onChange={addStickers}
                      />
                    </div>
                    {(stickers.length > 0 || stickerFiles.length > 0) && (
                      <>
                        <ul
                          className="space-y-[0.5rem]"
                          aria-label="스티커 목록"
                        >
                          {stickers.map((sticker, index) => (
                            <li
                              key={sticker.src}
                              className="border-b border-dashed border-[var(--atr-line)] pb-[0.45rem] afterroll-meta text-[0.72rem] text-[var(--atr-muted)]"
                            >
                              <div className="flex items-center justify-between gap-[0.75rem]">
                                <span>등록된 스티커 {index + 1}</span>
                                <button
                                  type="button"
                                  className="pc-link shrink-0"
                                  onClick={() =>
                                    setStickers((current) =>
                                      current.filter(
                                        (_, itemIndex) => itemIndex !== index,
                                      ),
                                    )
                                  }
                                >
                                  제거
                                </button>
                              </div>
                              <label className="mt-[0.3rem] flex items-center gap-[0.5rem]">
                                <span className="shrink-0 text-[var(--atr-soft)]">
                                  크기{" "}
                                  {Math.round(
                                    (sticker.size ?? DEFAULT_STICKER_SIZE) *
                                      100,
                                  )}
                                  %
                                </span>
                                <input
                                  className="w-full accent-[var(--atr-accent)]"
                                  type="range"
                                  min={STICKER_SIZE_MIN}
                                  max={STICKER_SIZE_MAX}
                                  step={STICKER_SIZE_STEP}
                                  value={sticker.size ?? DEFAULT_STICKER_SIZE}
                                  onChange={(event) =>
                                    setStickers((current) =>
                                      current.map((item, itemIndex) =>
                                        itemIndex === index
                                          ? {
                                              ...item,
                                              size: Number(event.target.value),
                                            }
                                          : item,
                                      ),
                                    )
                                  }
                                  aria-label={`등록된 스티커 ${index + 1} 크기`}
                                />
                              </label>
                            </li>
                          ))}
                          {stickerFiles.map((sticker, index) => (
                            <li
                              key={`${sticker.name}-${index}`}
                              className="border-b border-dashed border-[var(--atr-line)] pb-[0.45rem] afterroll-meta text-[0.72rem] text-[var(--atr-muted)]"
                            >
                              <div className="flex items-center justify-between gap-[0.75rem]">
                                <span className="truncate">{sticker.name}</span>
                                <button
                                  type="button"
                                  className="pc-link shrink-0"
                                  onClick={() => {
                                    setStickerFiles((current) =>
                                      current.filter(
                                        (_, itemIndex) => itemIndex !== index,
                                      ),
                                    );
                                    setStickerSizes((current) =>
                                      current.filter(
                                        (_, itemIndex) => itemIndex !== index,
                                      ),
                                    );
                                  }}
                                >
                                  제거
                                </button>
                              </div>
                              <label className="mt-[0.3rem] flex items-center gap-[0.5rem]">
                                <span className="shrink-0 text-[var(--atr-soft)]">
                                  크기{" "}
                                  {Math.round(
                                    (stickerSizes[index] ??
                                      DEFAULT_STICKER_SIZE) * 100,
                                  )}
                                  %
                                </span>
                                <input
                                  className="w-full accent-[var(--atr-accent)]"
                                  type="range"
                                  min={STICKER_SIZE_MIN}
                                  max={STICKER_SIZE_MAX}
                                  step={STICKER_SIZE_STEP}
                                  value={
                                    stickerSizes[index] ?? DEFAULT_STICKER_SIZE
                                  }
                                  onChange={(event) =>
                                    setStickerSizes((current) =>
                                      current.map((size, itemIndex) =>
                                        itemIndex === index
                                          ? Number(event.target.value)
                                          : size,
                                      ),
                                    )
                                  }
                                  aria-label={`${sticker.name} 스티커 크기`}
                                />
                              </label>
                            </li>
                          ))}
                        </ul>
                        <StickerPreview
                          stickers={[
                            ...stickers,
                            ...stickerPreviews.map((src, index) => ({
                              src,
                              size: stickerSizes[index] ?? DEFAULT_STICKER_SIZE,
                            })),
                          ]}
                        />
                      </>
                    )}
                  </section>
                )}
                {mode === "edit" && (
                  <>
                    <section>
                      <div className="mb-[0.45rem] flex items-center justify-between gap-[0.75rem]">
                        <p className="pc-field-label mb-0">링크</p>
                        <button
                          type="button"
                          className="pc-link"
                          onClick={() =>
                            setLinks((current) => [
                              ...current,
                              { name: "", url: "" },
                            ])
                          }
                        >
                          + 링크 추가
                        </button>
                      </div>
                      <div className="space-y-[0.5rem]">
                        {links.map((link, index) => (
                          <div
                            key={index}
                            className="grid gap-[0.5rem] sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]"
                          >
                            <input
                              className="pc-field"
                              value={link.name}
                              onChange={(event) =>
                                setLinks((current) =>
                                  current.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, name: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                              placeholder="이름"
                              aria-label={`링크 ${index + 1} 이름`}
                            />
                            <input
                              className="pc-field"
                              type="url"
                              value={link.url}
                              onChange={(event) =>
                                setLinks((current) =>
                                  current.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, url: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                              placeholder="https://..."
                              aria-label={`링크 ${index + 1} 주소`}
                            />
                            <button
                              type="button"
                              className="pc-link justify-self-end sm:self-center"
                              onClick={() =>
                                setLinks((current) =>
                                  current.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                  ),
                                )
                              }
                              aria-label={`링크 ${index + 1} 삭제`}
                            >
                              삭제
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                    <section>
                      <div className="mb-[0.45rem] flex items-center justify-between gap-[0.75rem]">
                        <div>
                          <p className="pc-field-label mb-0">비공개 링크</p>
                          <p className="afterroll-meta mt-[0.15rem] text-[0.68rem] text-[var(--atr-soft)]">
                            관리자 로그인 시에만 표시됩니다.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="pc-link"
                          onClick={() =>
                            setPrivateLinks((current) => [
                              ...current,
                              { name: "", url: "" },
                            ])
                          }
                        >
                          + 링크 추가
                        </button>
                      </div>
                      <div className="space-y-[0.5rem]">
                        {privateLinks.map((link, index) => (
                          <div
                            key={index}
                            className="grid gap-[0.5rem] sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]"
                          >
                            <input
                              className="pc-field"
                              value={link.name}
                              onChange={(event) =>
                                setPrivateLinks((current) =>
                                  current.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, name: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                              placeholder="이름"
                              aria-label={`비공개 링크 ${index + 1} 이름`}
                            />
                            <input
                              className="pc-field"
                              type="url"
                              value={link.url}
                              onChange={(event) =>
                                setPrivateLinks((current) =>
                                  current.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, url: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                              placeholder="https://..."
                              aria-label={`비공개 링크 ${index + 1} 주소`}
                            />
                            <button
                              type="button"
                              className="pc-link justify-self-end sm:self-center"
                              onClick={() =>
                                setPrivateLinks((current) =>
                                  current.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                  ),
                                )
                              }
                              aria-label={`비공개 링크 ${index + 1} 삭제`}
                            >
                              삭제
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                    <CharacterSessionSelector
                      value={sessionKeys}
                      onChange={setSessionKeys}
                    />
                  </>
                )}
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
                <div className="flex justify-end gap-[0.45rem]">
                  {mode === "edit" && (
                    <button
                      type="button"
                      className="pc-text-button"
                      disabled={saving}
                      onClick={resetEditForm}
                    >
                      초기화
                    </button>
                  )}
                  <button
                    type="button"
                    className="pc-text-button"
                    onClick={close}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className={
                      mode === "delete"
                        ? "pc-danger-button"
                        : "pc-primary-button"
                    }
                    disabled={
                      saving ||
                      !token.trim() ||
                      (mode === "edit" && !values.name.trim())
                    }
                    onClick={() => void (mode === "edit" ? save() : remove())}
                  >
                    {saving
                      ? "처리 중…"
                      : mode === "edit"
                        ? "수정 저장"
                        : "삭제"}
                  </button>
                </div>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
