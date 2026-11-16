"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
} from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  Ban,
  BatteryFull,
  Check,
  CheckCircle2,
  ClipboardPaste,
  Clock3,
  Copy,
  CreditCard,
  FileCheck2,
  Fingerprint,
  Flame,
  Gauge,
  Globe,
  KeyRound,
  Landmark,
  Link2,
  Loader2,
  Lock,
  MessageSquareWarning,
  PhoneIncoming,
  PhoneOff,
  Radar,
  RotateCcw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Signal,
  Siren,
  Timer,
  UserRound,
  Users,
  Wifi,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import {
  analyzeScamText,
  type ScamAnalysis,
  type ScamSeverity,
  type ScamTrigger,
} from "@/lib/scam-engine";

/* -------------------------------------------------------------------------- */
/*  Domain types                                                              */
/* -------------------------------------------------------------------------- */

type Tab = "transfer" | "trustlens" | "guardpay" | "scam";
type ProfileRole = "guardian" | "protected";
type RecipientMode = "trusted" | "unknown";
type Decision = "ALLOW" | "COOL_DOWN" | "GUARDIAN_APPROVAL" | "BLOCK";
type TelemetryLevel = "info" | "success" | "warn" | "danger";
type HoldStatus = "pending" | "approved" | "blocked";
type PhishStatus = "safe" | "suspicious" | "phishing";

interface Receipt {
  id: string;
  timestamp: string;
  sender: string;
  recipient: string;
  amount: number;
}

interface SignedReceipt extends Receipt {
  signature: string;
}

interface VerifyResult {
  isValid: boolean;
  stored: string;
  computed: string;
  canonical: string;
  computedHex: string;
}

interface RiskFactors {
  unverifiedCallActive: boolean;
  officialBccCallActive: boolean;
  clipboardUsed: boolean;
  highAmountVelocity: boolean;
  newRecipient: boolean;
  recentScamAlert: boolean;
  vulnerableProfile: boolean;
}

interface RiskWeight {
  key: string;
  label: string;
  points: number;
  active: boolean;
}

interface RiskResult {
  score: number;
  raw: number;
  decision: Decision;
  weights: RiskWeight[];
}

interface TelemetryEntry {
  id: string;
  time: string;
  level: TelemetryLevel;
  message: string;
}

interface TransferRecord {
  id: string;
  recipient: string;
  amount: number;
  timeLabel: string;
  status: string;
  signature?: string;
}

interface HoldRequest {
  id: string;
  from: string;
  fromAlias: string;
  to: string;
  amount: number;
  reason: string;
  createdLabel: string;
  status: HoldStatus;
  source: "self" | "family";
  signature?: string;
}

interface PendingTransfer {
  sender: string;
  recipient: string;
  card: string;
  amount: number;
}

type ModalState =
  | { kind: "none" }
  | { kind: "success"; receipt: SignedReceipt }
  | { kind: "cooldown"; pending: PendingTransfer }
  | { kind: "hold"; hold: HoldRequest }
  | { kind: "block"; triggers: RiskWeight[]; score: number };

interface PhishAnalysis {
  url: string;
  score: number;
  status: PhishStatus;
  domain: string;
  age: string;
  ssl: string;
  typosquat: string;
  verdict: string;
  findings: string[];
}

interface Relative {
  name: string;
  shortName: string;
  age: number;
  limit: number;
  initials: string;
  isApashka?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const MASTER_KEY = "BCC-SHIELD-360-MASTER-CRYPTO-KEY-2026-KZ";
const TRUSTED_CARD = "4400 4312 5007 1184";
const DROPPER_CARD = "4400 4301 9928 7741";
const OWN_CARD = "4400 43** **** 8821";
const INITIAL_BALANCE = 1_450_000;
const INITIAL_FAMILY_BALANCE = 620_000;

const COOLDOWN_CHECKS = [
  "Мне НЕ звонят из Нацбанка, КНБ, полиции или курьерской службы",
  "Меня НЕ просят перевести деньги на «безопасный» или «резервный» счет",
  "Я лично знаю получателя и подтверждаю перевод",
];

const SESSION_WORDS = [
  "АЛТЫН",
  "ТУЛПАР",
  "САРЫ-АРКА",
  "БАЙТЕРЕК",
  "АСТАНА",
  "КӨК-ТӨБЕ",
  "АЛАУ",
  "ЖЕЛТОКСАН",
];

const RELATIVES: Relative[] = [
  {
    name: "Сауле «Апашка» Ахметова",
    shortName: "Апашка",
    age: 68,
    limit: 100_000,
    initials: "СА",
    isApashka: true,
  },
  {
    name: "Алихан Сериков",
    shortName: "Алихан",
    age: 17,
    limit: 50_000,
    initials: "АС",
  },
  {
    name: "Гульнара Серикова",
    shortName: "Гульнара",
    age: 45,
    limit: 200_000,
    initials: "ГС",
  },
];

const SEED_HOLD: HoldRequest = {
  id: "HOLD-2026-0417",
  from: "Сауле Ахметова",
  fromAlias: "Апашка, 68 лет",
  to: "Неизвестная карта 4400 •••• 7741",
  amount: 380_000,
  reason: "Во время звонка с неизвестного номера + вставка из буфера",
  createdLabel: "сегодня, 14:06",
  status: "pending",
  source: "family",
};

const SCAM_PRESETS = [
  {
    id: "nbk",
    label: '🏦 Сценарий "Нацбанк и КНБ"',
    short: "Ложный следователь и «резервный счет»",
    text:
      "Здравствуйте, это старший следователь департамента полиции и куратор Нацбанка РК. На ваше имя прямо сейчас в отделении пытаются оформить зеркальный кредит на 5 миллионов тенге. Чтобы аннулировать заявку, срочно переведите средства на резервный защищенный счет Нацбанка, никому не сообщайте об операции — идет секретная проверка!",
  },
  {
    id: "delivery",
    label: '📦 Сценарий "Курьер Казпочты / Доставка"',
    short: "Просьба продиктовать код из SMS",
    text:
      "Вам пришла заказная посылка с маркетплейса. Для оформления возврата или переадресации курьеру продиктуйте, пожалуйста, 4-значный код, который только что пришел вам в SMS от 1414 / банка.",
  },
  {
    id: "invest",
    label: '📈 Сценарий "Лже-инвестиции нацкомпаний"',
    short: "Гарантированные дивиденды и привязка карты",
    text:
      "Государственная программа инвестиций для граждан Казахстана! Вложите 50 000 тенге сегодня и получайте гарантированные дивиденды от добычи нефти до 850 000 тенге каждую неделю. Переходите по ссылке для привязки карты.",
  },
  {
    id: "legit",
    label: '💬 Сценарий "Легитимное сообщение"',
    short: "Обычная просьба друга",
    text:
      "Марат, привет! Скинь, пожалуйста, 5 000 тенге за вчерашний кофе и обед, когда будешь свободен. Спасибо!",
  },
];

const PHISH_PRESETS: PhishAnalysis[] = [
  {
    url: "bcc.kz/kartakarta",
    score: 2,
    status: "safe",
    domain: "bcc.kz",
    age: "25+ лет",
    ssl: "TLS 1.3, сертификат валиден",
    typosquat: "Не обнаружено",
    verdict: "Официальный портал BCC Bank",
    findings: [
      "Домен входит в официальную зону bcc.kz",
      "Сертификат выдан удостоверенным центром Казахстана",
      "Нет скриптов перехвата форм и OTP-кодов",
    ],
  },
  {
    url: "bcc-bonus-kz.site/login",
    score: 96,
    status: "phishing",
    domain: "bcc-bonus-kz.site",
    age: "36 часов",
    ssl: "Let's Encrypt, выдан 1 день назад",
    typosquat: "bcc-bonus-kz.site имитирует bcc.kz",
    verdict: "Фишинг. Не вводите данные карты",
    findings: [
      "Клон формы интернет-банкинга BCC",
      "JavaScript перехватывает OTP-коды из SMS",
      "Домен зарегистрирован 36 часов назад",
      "Хостинг вне Казахстана",
    ],
  },
  {
    url: "egov-vyplata-2026.org",
    score: 98,
    status: "phishing",
    domain: "egov-vyplata-2026.org",
    age: "4 дня",
    ssl: "Let's Encrypt, валиден",
    typosquat: "Эксплуатация бренда eGov",
    verdict: "Фишинг. Схема «социальные выплаты РК»",
    findings: [
      "Сбор CVV и пароля от интернет-банкинга",
      "Поддельная авторизация через ЭЦП",
      "Требование оплатить «комиссию» за выплату",
    ],
  },
  {
    url: "kazpost-dostavka-id.xyz",
    score: 91,
    status: "phishing",
    domain: "kazpost-dostavka-id.xyz",
    age: "11 дней",
    ssl: "TLS 1.2, организация не подтверждена",
    typosquat: "kazpost-dostavka-id.xyz имитирует Казпочту",
    verdict: "Фишинг. Фейковая оплата пошлины",
    findings: [
      "Поддельная форма 3D-Secure",
      "Запрос кода подтверждения из SMS",
      "Оплата «пошлины» уходит на карту дроппера",
    ],
  },
];

const DECISION_META: Record<
  Decision,
  {
    label: string;
    ru: string;
    hex: string;
    badgeClass: string;
    dotClass: string;
  }
> = {
  ALLOW: {
    label: "ALLOW",
    ru: "Разрешено",
    hex: "#10B981",
    badgeClass: "border-[#10B981]/40 bg-[#10B981]/10 text-[#6EE7B7]",
    dotClass: "bg-[#10B981]",
  },
  COOL_DOWN: {
    label: "COOL_DOWN",
    ru: "Период охлаждения",
    hex: "#F59E0B",
    badgeClass: "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FCD34D]",
    dotClass: "bg-[#F59E0B]",
  },
  GUARDIAN_APPROVAL: {
    label: "GUARDIAN_APPROVAL",
    ru: "Нужен Хранитель",
    hex: "#8B5CF6",
    badgeClass: "border-[#8B5CF6]/40 bg-[#8B5CF6]/10 text-[#C4B5FD]",
    dotClass: "bg-[#8B5CF6]",
  },
  BLOCK: {
    label: "BLOCK",
    ru: "Блокировка",
    hex: "#EF4444",
    badgeClass: "border-[#EF4444]/45 bg-[#EF4444]/10 text-[#FCA5A5]",
    dotClass: "bg-[#EF4444]",
  },
};

const SCREEN_META: Record<Tab, { title: string; subtitle: string }> = {
  transfer: {
    title: "Перевод",
    subtitle: "SafeCall Shield проверяет каждую операцию",
  },
  trustlens: {
    title: "TrustLens",
    subtitle: "Подлинность звонка и криптопечать чека",
  },
  guardpay: {
    title: "GuardPay",
    subtitle: "Семейный мультисиг и антифишинг",
  },
  scam: {
    title: "AI Scam-Scanner",
    subtitle: "Разбор текста на приемы социальной инженерии",
  },
};

const SEVERITY_CLASS: Record<ScamSeverity, string> = {
  critical: "scam-mark scam-mark-critical",
  high: "scam-mark scam-mark-high",
  medium: "scam-mark scam-mark-medium",
};

const SEVERITY_LABEL_CLASS: Record<ScamSeverity, string> = {
  critical: "border-[#EF4444]/35 bg-[#EF4444]/10 text-[#FCA5A5]",
  high: "border-[#F59E0B]/35 bg-[#F59E0B]/10 text-[#FCD34D]",
  medium: "border-[#34D399]/30 bg-[#34D399]/10 text-[#A7F3D0]",
};

/* -------------------------------------------------------------------------- */
/*  Formatting helpers                                                        */
/* -------------------------------------------------------------------------- */

function formatNumber(value: number): string {
  const rounded = Math.round(value);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function formatKzt(value: number): string {
  return `${formatNumber(value)} ₸`;
}

function formatCard(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

function pad2(value: number): string {
  return value.toString().padStart(2, "0");
}

/**
 * The mock status bar always reads 14:20. All demo timestamps are shifted by
 * the same offset so telemetry and receipts stay consistent with it.
 */
const DEMO_TIME_OFFSET_MS = (() => {
  const now = new Date();
  const target = new Date(now);
  target.setHours(14, 20, 0, 0);
  return target.getTime() - now.getTime();
})();

function demoClock(date: Date): Date {
  return new Date(date.getTime() + DEMO_TIME_OFFSET_MS);
}

function formatClock(date: Date): string {
  const shifted = demoClock(date);
  return `${pad2(shifted.getHours())}:${pad2(shifted.getMinutes())}:${pad2(
    shifted.getSeconds(),
  )}`;
}

const MONTHS_SHORT = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

function formatDateTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  const date = demoClock(parsed);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}, ${pad2(
    date.getHours(),
  )}:${pad2(date.getMinutes())}`;
}

/* -------------------------------------------------------------------------- */
/*  Unified Risk Engine                                                       */
/* -------------------------------------------------------------------------- */

function decisionFor(score: number): Decision {
  if (score >= 85) return "BLOCK";
  if (score >= 60) return "GUARDIAN_APPROVAL";
  if (score >= 30) return "COOL_DOWN";
  return "ALLOW";
}

function computeRisk(factors: RiskFactors): RiskResult {
  const weights: RiskWeight[] = [
    {
      key: "unverified_call",
      label: "Звонок с неизвестного номера",
      points: 35,
      active: factors.unverifiedCallActive,
    },
    {
      key: "clipboard",
      label: "Вставка реквизитов из буфера",
      points: 20,
      active: factors.clipboardUsed,
    },
    {
      key: "high_amount",
      label: "Сумма от 200 000 ₸",
      points: 20,
      active: factors.highAmountVelocity,
    },
    {
      key: "new_recipient",
      label: "Новый получатель",
      points: 15,
      active: factors.newRecipient,
    },
    {
      key: "recent_alert",
      label: "Недавний алерт AI Scam-Scanner",
      points: 25,
      active: factors.recentScamAlert,
    },
    {
      key: "vulnerable",
      label: "Уязвимый профиль (68 лет)",
      points: 15,
      active: factors.vulnerableProfile,
    },
    {
      key: "synergy",
      label: "Синергия: звонок + буфер",
      points: 15,
      active: factors.unverifiedCallActive && factors.clipboardUsed,
    },
  ];

  const raw = weights.reduce(
    (sum, weight) => (weight.active ? sum + weight.points : sum),
    0,
  );
  const score = Math.min(100, raw);

  return { score, raw, decision: decisionFor(score), weights };
}

/* -------------------------------------------------------------------------- */
/*  Cryptographic core: real HMAC-SHA256 via Web Crypto                       */
/* -------------------------------------------------------------------------- */

let cachedHmacKey: CryptoKey | null = null;

function buildCanonical(receipt: Receipt): string {
  return `${receipt.id}|${receipt.timestamp}|${receipt.sender}|${receipt.recipient}|${receipt.amount}|BCC`;
}

async function getHmacKey(): Promise<CryptoKey> {
  if (cachedHmacKey) return cachedHmacKey;
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto недоступен: требуется HTTPS или localhost");
  }
  cachedHmacKey = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(MASTER_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return cachedHmacKey;
}

async function hmacSha256Hex(message: string): Promise<string> {
  const key = await getHmacKey();
  const signature = await window.crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function formatSignature(hex: string): string {
  const short = hex.slice(0, 16).toUpperCase();
  return `BCC-${short.slice(0, 4)}-${short.slice(4, 8)}-${short.slice(
    8,
    12,
  )}-${short.slice(12, 16)}`;
}

async function signReceipt(receipt: Receipt): Promise<SignedReceipt> {
  const hex = await hmacSha256Hex(buildCanonical(receipt));
  return { ...receipt, signature: formatSignature(hex) };
}

async function verifyReceipt(
  receiptData: Receipt,
  signatureHex: string,
): Promise<VerifyResult> {
  const canonical = buildCanonical(receiptData);
  const computedHex = await hmacSha256Hex(canonical);
  const computed = formatSignature(computedHex);
  return {
    isValid: computed === signatureHex,
    stored: signatureHex,
    computed,
    canonical,
    computedHex,
  };
}

/* -------------------------------------------------------------------------- */
/*  URL sandbox                                                               */
/* -------------------------------------------------------------------------- */

function normalizeHost(raw: string): string {
  const trimmed = raw.trim();
  try {
    const parsed = new URL(
      trimmed.includes("://") ? trimmed : `https://${trimmed}`,
    );
    return parsed.hostname.toLowerCase();
  } catch {
    return trimmed.split("/")[0]?.toLowerCase() ?? trimmed.toLowerCase();
  }
}

function analyzePhishUrl(raw: string): PhishAnalysis {
  const normalized = raw.trim().toLowerCase();
  const preset = PHISH_PRESETS.find(
    (item) =>
      item.url.toLowerCase() === normalized ||
      normalized.startsWith(`${item.url.toLowerCase()}/`),
  );
  if (preset) return { ...preset };

  const host = normalizeHost(raw);
  const findings: string[] = [];
  let score = 8;

  if (!raw.trim().toLowerCase().startsWith("https://")) {
    score += 15;
    findings.push("Соединение без HTTPS либо протокол не указан");
  }

  if (host === "bcc.kz" || host.endsWith(".bcc.kz")) {
    return {
      url: raw.trim(),
      score: 4,
      status: "safe",
      domain: host,
      age: "нет данных WHOIS в демо",
      ssl: "HTTPS, сертификат предъявлен",
      typosquat: "Домен принадлежит официальной зоне BCC",
      verdict: "Домен относится к официальной зоне BCC Bank",
      findings: [
        "Домен входит в официальную зону bcc.kz",
        "Не найдено имитации стороннего бренда",
      ],
    };
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    score += 30;
    findings.push("Вместо домена используется IP-адрес");
  }

  if (/\.(xyz|site|top|click|online|shop|icu|buzz|rest|monster)$/.test(host)) {
    score += 25;
    findings.push("Домен в зоне дешевой регистрации с высоким риском");
  }

  if (host.split("-").length >= 3) {
    score += 12;
    findings.push("Много дефисов в домене — типично для клонов");
  }

  if (/(bcc|centercredit|centrcredit|kaspi|halyk|egov|kazpost|1414)/.test(host) &&
      !host.endsWith("bcc.kz")) {
    score += 30;
    findings.push("Домен эксплуатирует бренд банка или госуслуг");
  }

  if (/(login|verify|secure|bonus|vyplata|payment|pay|auth|restore)/.test(normalized)) {
    score += 12;
    findings.push("В URL есть слово-приманка для ввода данных");
  }

  if (host.length > 28) {
    score += 8;
    findings.push("Слишком длинный домен, характерный для фишинга");
  }

  if (raw.includes("@")) {
    score += 15;
    findings.push("Символ @ в URL маскирует настоящий домен");
  }

  if (findings.length === 0) {
    findings.push("Явных сигнатур фишинга не найдено");
    findings.push("Домен не входит в белый список BCC");
  }

  score = Math.min(99, score);
  const status: PhishStatus =
    score >= 70 ? "phishing" : score >= 30 ? "suspicious" : "safe";

  return {
    url: raw.trim(),
    score,
    status,
    domain: host || "не определен",
    age: "нет данных WHOIS в демо",
    ssl: raw.trim().toLowerCase().startsWith("https://")
      ? "TLS предъявлен, издатель не проверен"
      : "HTTPS не используется",
    typosquat: /(bcc|centercredit|kaspi|halyk|egov|kazpost)/.test(host)
      ? "Обнаружена эксплуатация бренда"
      : "Не обнаружено",
    verdict:
      status === "phishing"
        ? "Фишинг. Не вводите данные и не оплачивайте"
        : status === "suspicious"
          ? "Подозрительный домен. Требуется ручная проверка"
          : "Сигнатур фишинга не найдено",
    findings,
  };
}

/* -------------------------------------------------------------------------- */
/*  Small reusable UI                                                         */
/* -------------------------------------------------------------------------- */

function RiskBadge({
  decision,
  score,
  withLabel = false,
}: {
  decision: Decision;
  score: number;
  withLabel?: boolean;
}) {
  const meta = DECISION_META[decision];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] tabular-nums ${meta.badgeClass}`}
      title={`${meta.ru} · ${score}/100`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
      {score}
      {withLabel ? ` · ${meta.label}` : ""}
    </span>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
        checked
          ? "border-[#00A859] bg-[#00A859]"
          : "border-[#1E4233] bg-[#0B1F17]"
      }`}
    >
      <span
        className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

function RiskScale({ risk }: { risk: RiskResult }) {
  const meta = DECISION_META[risk.decision];
  return (
    <div className="mt-3">
      <div className="relative h-2.5 overflow-hidden rounded-full border border-[#1E4233] bg-[#06110C]">
        <div
          className="h-full w-full origin-left rounded-full transition-transform duration-500"
          style={{
            backgroundColor: meta.hex,
            transform: `scaleX(${risk.score / 100})`,
          }}
        />
        {[30, 60, 85].map((tick) => (
          <span
            key={tick}
            className="absolute top-0 h-full w-px bg-white/20"
            style={{ left: `${tick}%` }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[9px] text-[#648975]">
        <span>0</span>
        <span>30</span>
        <span>60</span>
        <span>85</span>
        <span>100</span>
      </div>
    </div>
  );
}

function qrCells(seed: string): boolean[] {
  const size = 17;
  const cells = new Array<boolean>(size * size).fill(false);
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const random = () => {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    hash >>>= 0;
    return hash / 4294967296;
  };

  const finders = [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ];

  const inFinder = (x: number, y: number) =>
    finders.some(
      ([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7,
    );

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (inFinder(x, y)) continue;
      cells[y * size + x] = random() > 0.54;
    }
  }

  for (const [fx, fy] of finders) {
    for (let dy = 0; dy < 7; dy += 1) {
      for (let dx = 0; dx < 7; dx += 1) {
        const border = dx === 0 || dx === 6 || dy === 0 || dy === 6;
        const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        cells[(fy + dy) * size + (fx + dx)] = border || core;
      }
    }
  }

  for (let x = 8; x < size - 8; x += 1) {
    cells[6 * size + x] = x % 2 === 0;
  }

  return cells;
}

function QrGlyph({ seed }: { seed: string }) {
  const cells = useMemo(() => qrCells(seed), [seed]);
  return (
    <div
      className="qr-grid grid h-[86px] w-[86px] grid-cols-[repeat(17,1fr)] gap-0 rounded-md bg-[#E8F5EE] p-1.5"
      aria-hidden="true"
    >
      {cells.map((filled, index) => (
        <span
          key={index}
          className={`aspect-square ${filled ? "bg-[#0B1F17]" : "bg-transparent"}`}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Jury Control & Telemetry Deck                                             */
/* -------------------------------------------------------------------------- */

interface JuryPanelProps {
  risk: RiskResult;
  factors: RiskFactors;
  role: ProfileRole;
  logs: TelemetryEntry[];
  onToggleUnverifiedCall: () => void;
  onToggleOfficialCall: () => void;
  onToggleClipboard: () => void;
  onToggleRole: () => void;
  onStorm: () => void;
  onReset: () => void;
}

type JuryTone = "danger" | "success" | "warning" | "guardian";

const JURY_TONE: Record<
  JuryTone,
  { activeRow: string; activeIcon: string; inactiveIcon: string }
> = {
  danger: {
    activeRow: "border-[#EF4444]/45 bg-[#EF4444]/10",
    activeIcon: "bg-[#EF4444]/15 text-[#FCA5A5]",
    inactiveIcon: "bg-[#122B21] text-[#7FA793]",
  },
  success: {
    activeRow: "border-[#10B981]/45 bg-[#10B981]/10",
    activeIcon: "bg-[#10B981]/15 text-[#6EE7B7]",
    inactiveIcon: "bg-[#122B21] text-[#7FA793]",
  },
  warning: {
    activeRow: "border-[#F59E0B]/45 bg-[#F59E0B]/10",
    activeIcon: "bg-[#F59E0B]/15 text-[#FCD34D]",
    inactiveIcon: "bg-[#122B21] text-[#7FA793]",
  },
  guardian: {
    activeRow: "border-[#8B5CF6]/45 bg-[#8B5CF6]/10",
    activeIcon: "bg-[#8B5CF6]/15 text-[#C4B5FD]",
    inactiveIcon: "bg-[#122B21] text-[#7FA793]",
  },
};

function JuryToggleRow({
  glyph,
  label,
  hint,
  checked,
  tone,
  onChange,
}: {
  glyph: string;
  label: string;
  hint: string;
  checked: boolean;
  tone: JuryTone;
  onChange: () => void;
}) {
  const palette = JURY_TONE[tone];
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-colors ${
        checked
          ? palette.activeRow
          : "border-[#1E4233]/70 bg-[#122B21]/35"
      }`}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[15px] ${
          checked ? palette.activeIcon : palette.inactiveIcon
        }`}
        aria-hidden="true"
      >
        {glyph}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-medium leading-tight text-[#E8F5EE]">
          {label}
        </p>
        <p className="mt-0.5 text-[10px] leading-snug text-[#7FA793]">
          {hint}
        </p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function JuryPanel({
  risk,
  factors,
  role,
  logs,
  onToggleUnverifiedCall,
  onToggleOfficialCall,
  onToggleClipboard,
  onToggleRole,
  onStorm,
  onReset,
}: JuryPanelProps) {
  const meta = DECISION_META[risk.decision];
  const activeWeights = risk.weights.filter((weight) => weight.active);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3.5 rounded-2xl border border-[#1E4233] bg-[#0B1F17] p-4 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-medium text-[#E8F5EE]">
            Jury Control
          </h2>
          <p className="mt-0.5 text-[10.5px] text-[#7FA793]">
            Симуляция атак и телеметрия в реальном времени
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-1 text-[9.5px] text-[#6EE7B7]">
          <span className="h-1.5 w-1.5 animate-live-pulse rounded-full bg-[#10B981]" />
          LIVE
        </span>
      </div>

      <div className="rounded-xl border border-[#1E4233] bg-[#06110C] p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium text-[#7FA793]">
              Unified Risk Score
            </p>
            <p
              className="mt-1 font-mono text-[42px] font-medium leading-none tabular-nums"
              style={{ color: meta.hex }}
            >
              {risk.score}
              <span className="text-[14px] text-[#648975]">/100</span>
            </p>
          </div>
          <div className="text-right">
            <span
              className={`inline-flex rounded-md border px-2 py-1 font-mono text-[9.5px] ${meta.badgeClass}`}
            >
              {meta.label}
            </span>
            <p className="mt-1 text-[10px] text-[#7FA793]">{meta.ru}</p>
          </div>
        </div>

        <RiskScale risk={risk} />

        <div className="mt-3 flex flex-wrap gap-1.5">
          {activeWeights.length === 0 ? (
            <span className="rounded-md border border-[#1E4233] bg-[#122B21] px-2 py-1 text-[10px] text-[#7FA793]">
              Нет активных триггеров
            </span>
          ) : (
            activeWeights.map((weight) => (
              <span
                key={weight.key}
                className="rounded-md border border-[#1E4233] bg-[#122B21] px-2 py-1 text-[9.5px] text-[#A9CBB9]"
              >
                {weight.label}{" "}
                <span className="font-mono text-[#34D399]">
                  +{weight.points}
                </span>
              </span>
            ))
          )}
        </div>
        <p className="mt-2 font-mono text-[10.5px] text-[#7FA793]">
          {activeWeights.length
            ? `${activeWeights
                .map((weight) => weight.points)
                .join(" + ")} = ${risk.raw}${
                risk.raw > risk.score ? ` → ${risk.score} (лимит 100)` : ""
              }`
            : "Активных факторов нет"}
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between px-0.5">
          <h3 className="text-[11px] font-medium text-[#A9CBB9]">
            Сценарии атаки
          </h3>
          <span className="text-[9.5px] text-[#648975]">5 пресетов</span>
        </div>
        <div className="space-y-1.5">
          <JuryToggleRow
            glyph="📞"
            label="Симулировать звонок с неизвестного номера"
            hint="+35 к риску · TrustLens не подтверждает сессию"
            checked={factors.unverifiedCallActive}
            tone="danger"
            onChange={onToggleUnverifiedCall}
          />
          <JuryToggleRow
            glyph="🎧"
            label="Официальный звонок оператора BCC"
            hint="TrustLens Verified · взаимоисключающий с п.1"
            checked={factors.officialBccCallActive}
            tone="success"
            onChange={onToggleOfficialCall}
          />
          <JuryToggleRow
            glyph="📋"
            label="Вставка карты дроппера из буфера"
            hint="+20 к риску · заполняет 4400 4301 9928 7741"
            checked={factors.clipboardUsed}
            tone="warning"
            onChange={onToggleClipboard}
          />
          <JuryToggleRow
            glyph="👵"
            label={
              role === "protected"
                ? "Профиль: Апашка, 68 лет, под защитой"
                : "Профиль: Хранитель семьи (Марат)"
            }
            hint="Переключить защищаемый профиль · +15 для Апашки"
            checked={role === "protected"}
            tone="guardian"
            onChange={onToggleRole}
          />
        </div>

        <button
          type="button"
          onClick={onStorm}
          className="mt-2 flex w-full items-center gap-2.5 rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-2.5 py-2.5 text-left transition-colors hover:bg-[#EF4444]/15"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#EF4444]/15 text-[15px]">
            🔥
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11.5px] font-medium text-[#FCA5A5]">
              Сценарий «Идеальный шторм»
            </span>
            <span className="mt-0.5 block text-[10px] leading-snug text-[#B98D8D]">
              Звонок мошенника + буфер + 450 000 ₸ в один клик
            </span>
          </span>
          <ArrowRight size={14} className="shrink-0 text-[#FCA5A5]" />
        </button>

        <button
          type="button"
          onClick={onReset}
          className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#1E4233] bg-transparent px-2 py-1.5 text-[10px] text-[#7FA793] transition-colors hover:bg-[#122B21] hover:text-[#E8F5EE]"
        >
          <RotateCcw size={11} />
          Сбросить все триггеры
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-[#1E4233] bg-[#06110C]">
        <div className="flex items-center justify-between border-b border-[#1E4233]/70 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Activity size={12} className="text-[#34D399]" />
            <h3 className="text-[10.5px] font-medium text-[#A9CBB9]">
              Security Telemetry Feed
            </h3>
          </div>
          <span className="font-mono text-[9px] text-[#648975]">
            {logs.length}
          </span>
        </div>
        <div className="bcc-scroll max-h-[210px] min-h-[72px] flex-1 space-y-2 overflow-y-auto px-3 py-2 lg:max-h-none">
          {logs.length === 0 ? (
            <p className="py-3 text-center text-[10px] text-[#648975]">
              Событий пока нет
            </p>
          ) : (
            logs.map((entry) => (
              <div key={entry.id} className="flex gap-2">
                <span
                  className={`mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full ${
                    entry.level === "success"
                      ? "bg-[#10B981]"
                      : entry.level === "warn"
                        ? "bg-[#F59E0B]"
                        : entry.level === "danger"
                          ? "bg-[#EF4444]"
                          : "bg-[#34D399]"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10.5px] leading-snug text-[#C4DDD1]">
                    {entry.message}
                  </p>
                  <p className="mt-0.5 font-mono text-[9px] text-[#648975]">
                    {entry.time}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Application                                                               */
/* -------------------------------------------------------------------------- */

export default function Page() {
  const [tab, setTab] = useState<Tab>("transfer");
  const [role, setRole] = useState<ProfileRole>("guardian");
  const [juryOpen, setJuryOpen] = useState(false);

  const [unverifiedCallActive, setUnverifiedCallActive] = useState(false);
  const [officialBccCallActive, setOfficialBccCallActive] = useState(false);
  const [clipboardUsed, setClipboardUsed] = useState(false);
  const [recentScamAlert, setRecentScamAlert] = useState(false);

  const [recipientMode, setRecipientMode] = useState<RecipientMode>("trusted");
  const [cardValue, setCardValue] = useState(TRUSTED_CARD);
  const [amountText, setAmountText] = useState("");
  const [formError, setFormError] = useState("");
  const [sessionCode, setSessionCode] = useState("АЛТЫН-739");

  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [familyBalance, setFamilyBalance] = useState(INITIAL_FAMILY_BALANCE);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [holds, setHolds] = useState<HoldRequest[]>([]);
  const [savedTotal, setSavedTotal] = useState(0);
  const [guardError, setGuardError] = useState("");

  const [latestReceipt, setLatestReceipt] = useState<SignedReceipt | null>(null);
  const [cryptoError, setCryptoError] = useState("");
  const [tampered, setTampered] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [coolDown, setCoolDown] = useState(10);
  const [checks, setChecks] = useState([false, false, false]);

  const [logs, setLogs] = useState<TelemetryEntry[]>([]);
  const logCounter = useRef(0);

  const [scamText, setScamText] = useState("");
  const [scamResult, setScamResult] = useState<ScamAnalysis | null>(null);
  const [scamLoading, setScamLoading] = useState(false);
  const [scamError, setScamError] = useState("");

  const [phishUrl, setPhishUrl] = useState("");
  const [phishResult, setPhishResult] = useState<PhishAnalysis | null>(null);

  const pushLog = useCallback((level: TelemetryLevel, message: string) => {
    logCounter.current += 1;
    const entry: TelemetryEntry = {
      id: `log-${Date.now()}-${logCounter.current}`,
      time: formatClock(new Date()),
      level,
      message,
    };
    setLogs((previous) => [entry, ...previous].slice(0, 80));
  }, []);

  const amount = Number(amountText || 0);

  const factors = useMemo<RiskFactors>(
    () => ({
      unverifiedCallActive,
      officialBccCallActive,
      clipboardUsed,
      highAmountVelocity: amount >= 200_000,
      newRecipient: recipientMode === "unknown",
      recentScamAlert,
      vulnerableProfile: role === "protected",
    }),
    [
      unverifiedCallActive,
      officialBccCallActive,
      clipboardUsed,
      amount,
      recipientMode,
      recentScamAlert,
      role,
    ],
  );

  const risk = useMemo(() => computeRisk(factors), [factors]);
  const decisionMeta = DECISION_META[risk.decision];
  const pendingHolds = holds.filter((hold) => hold.status === "pending");

  const displayedReceipt = useMemo<SignedReceipt | null>(() => {
    if (!latestReceipt) return null;
    return {
      ...latestReceipt,
      amount: tampered ? latestReceipt.amount * 100 : latestReceipt.amount,
    };
  }, [latestReceipt, tampered]);

  const canConfirmCooldown = coolDown === 0 && checks.every(Boolean);
  const scamSegments = useMemo(
    () => (scamResult ? buildHighlightedSegments(scamText, scamResult.triggers) : []),
    [scamResult, scamText],
  );

  /* Seed demo state on the client only, so SSR and hydration stay identical. */
  useEffect(() => {
    const now = new Date();
    setLogs((previous) =>
      previous.length
        ? previous
        : [
            {
              id: "seed-log-1",
              time: formatClock(new Date(now.getTime() - 3 * 60_000)),
              level: "info",
              message:
                "BCC Shield 360 запущен. Профиль защиты: Хранитель семьи",
            },
            {
              id: "seed-log-2",
              time: formatClock(new Date(now.getTime() - 2 * 60_000)),
              level: "success",
              message:
                "Криптографическое ядро HMAC-SHA256 готово к выпуску чеков",
            },
            {
              id: "seed-log-3",
              time: formatClock(new Date(now.getTime() - 60_000)),
              level: "warn",
              message: "GuardPay: 1 перевод ожидает одобрения Хранителя",
            },
          ],
    );
    setHolds((previous) => (previous.length ? previous : [SEED_HOLD]));

    let cancelled = false;
    const demoReceipt: Receipt = {
      id: "BCC-2026-0412-88",
      timestamp: now.toISOString(),
      sender: "Марат Сериков",
      recipient: "Алихан Сериков",
      amount: 15_000,
    };

    signReceipt(demoReceipt)
      .then((signed) => {
        if (!cancelled) setLatestReceipt(signed);
      })
      .catch(() => {
        if (!cancelled) {
          setCryptoError(
            "Web Crypto недоступен. Откройте приложение по HTTPS или на localhost.",
          );
          pushLog(
            "danger",
            "Web Crypto недоступен: крипто-чеки не могут быть подписаны",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pushLog]);

  /* Cooldown countdown resets whenever the interception modal opens. */
  useEffect(() => {
    if (modal.kind !== "cooldown") return;
    setCoolDown(10);
    setChecks([false, false, false]);
    const interval = window.setInterval(() => {
      setCoolDown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [modal.kind]);

  useEffect(() => {
    if (!juryOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setJuryOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [juryOpen]);

  /* ---- Scenario controls ------------------------------------------------- */

  const toggleUnverifiedCall = () => {
    const next = !unverifiedCallActive;
    setUnverifiedCallActive(next);
    if (next) setOfficialBccCallActive(false);
    pushLog(
      next ? "danger" : "info",
      next
        ? "SafeCall: активен вызов с неизвестного номера. TrustLens не подтверждает сессию (+35)"
        : "SafeCall: вызов с неизвестного номера завершен",
    );
  };

  const toggleOfficialCall = () => {
    const next = !officialBccCallActive;
    setOfficialBccCallActive(next);
    if (next) setUnverifiedCallActive(false);
    pushLog(
      next ? "success" : "info",
      next
        ? "TrustLens: подтверждена сессия оператора Айгерим Садыковой"
        : "TrustLens: верифицированная сессия BCC завершена",
    );
  };

  const toggleClipboard = () => {
    const next = !clipboardUsed;
    setClipboardUsed(next);
    if (next) {
      setRecipientMode("unknown");
      setCardValue(DROPPER_CARD);
      setFormError("");
      pushLog(
        "warn",
        "Буфер обмена: карта 4400 4301 9928 7741 вставлена в форму (+20)",
      );
    } else {
      pushLog("info", "Буфер обмена: флаг вставки реквизитов снят");
    }
  };

  const toggleRole = () => {
    const next: ProfileRole = role === "protected" ? "guardian" : "protected";
    setRole(next);
    pushLog(
      "info",
      next === "protected"
        ? "Профиль: Апашка, 68 лет, под защитой (+15 к риску)"
        : "Профиль: Хранитель семьи Марат",
    );
  };

  const resetAttack = () => {
    setUnverifiedCallActive(false);
    setOfficialBccCallActive(false);
    setClipboardUsed(false);
    setRecentScamAlert(false);
    setRecipientMode("trusted");
    setCardValue(TRUSTED_CARD);
    setAmountText("");
    setFormError("");
    setTampered(false);
    setVerifyResult(null);
    setModal({ kind: "none" });
    pushLog(
      "info",
      "Атака сброшена. Все триггеры Unified Risk Engine обнулены",
    );
  };

  const activateStorm = () => {
    setUnverifiedCallActive(true);
    setOfficialBccCallActive(false);
    setClipboardUsed(true);
    setRecipientMode("unknown");
    setCardValue(DROPPER_CARD);
    setAmountText("450000");
    setFormError("");
    setTab("transfer");
    setJuryOpen(false);
    pushLog(
      "danger",
      "Идеальный шторм: звонок + буфер + 450 000 ₸. Risk Engine пересчитан",
    );
  };

  const newSessionCode = () => {
    const word =
      SESSION_WORDS[Math.floor(Math.random() * SESSION_WORDS.length)] ??
      "АЛТЫН";
    const digits = 100 + Math.floor(Math.random() * 900);
    const code = `${word}-${digits}`;
    setSessionCode(code);
    pushLog("success", `TrustLens: новое кодовое слово сессии ${code}`);
  };

  /* ---- Transfer form ----------------------------------------------------- */

  const selectRecipient = (mode: RecipientMode) => {
    setRecipientMode(mode);
    setCardValue(mode === "trusted" ? TRUSTED_CARD : "");
    setFormError("");
    if (mode === "unknown") {
      pushLog("warn", "Выбран новый получатель вне доверенного круга (+15)");
    }
  };

  const handleCardPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const raw = event.clipboardData.getData("text");
    const digits = raw.replace(/\D/g, "");
    if (digits.length >= 12) {
      event.preventDefault();
      setCardValue(formatCard(digits));
      setRecipientMode("unknown");
      setClipboardUsed(true);
      setFormError("");
      pushLog(
        "warn",
        "onPaste: реквизиты вставлены из буфера обмена (+20 к риску)",
      );
    }
  };

  const pasteFromClipboard = () => {
    setCardValue(DROPPER_CARD);
    setRecipientMode("unknown");
    setClipboardUsed(true);
    setFormError("");
    pushLog(
      "warn",
      "Буфер обмена: карта дроппера 4400 4301 9928 7741 вставлена в форму (+20)",
    );
  };

  const handleAmountChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 9);
    setAmountText(digits.replace(/^0+(?=\d)/, ""));
    setFormError("");
  };

  const handleCardChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 16);
    setCardValue(digits.length ? formatCard(digits) : "");
    setFormError("");
  };

  /* ---- Receipts and transfer execution ---------------------------------- */

  const finalizeTransfer = async (pending: PendingTransfer) => {
    if (balance < pending.amount) {
      setFormError("Недостаточно средств на счете");
      pushLog("danger", "Перевод отклонен: недостаточно средств");
      return;
    }

    try {
      const receipt = await signReceipt({
        id: `BCC-${Date.now().toString().slice(-9)}`,
        timestamp: new Date().toISOString(),
        sender: pending.sender,
        recipient: pending.recipient,
        amount: pending.amount,
      });

      setBalance((value) => Math.max(0, value - pending.amount));
      setLatestReceipt(receipt);
      setTampered(false);
      setVerifyResult(null);
      setCryptoError("");
      setAmountText("");
      setTransfers((previous) =>
        [
          {
            id: receipt.id,
            recipient: receipt.recipient,
            amount: receipt.amount,
            timeLabel: formatDateTime(receipt.timestamp),
            status: "Проведено",
            signature: receipt.signature,
          },
          ...previous,
        ].slice(0, 8),
      );
      pushLog(
        "success",
        `Перевод ${formatKzt(pending.amount)} → ${pending.recipient}. Крипто-чек ${receipt.signature}`,
      );
      setModal({ kind: "success", receipt });
    } catch {
      setCryptoError(
        "Не удалось подписать чек: Web Crypto недоступен в этом контексте.",
      );
      pushLog(
        "danger",
        "Ошибка HMAC-SHA256: крипто-чек не выпущен, перевод не проведен",
      );
    }
  };

  const freezeTransfer = (pending: PendingTransfer) => {
    const reason =
      risk.weights
        .filter((weight) => weight.active && weight.key !== "synergy")
        .map((weight) => weight.label)
        .join(" + ") || "Составной риск выше порога Хранителя";

    const hold: HoldRequest = {
      id: `HOLD-${Date.now().toString().slice(-8)}`,
      from: pending.sender,
      fromAlias:
        role === "protected" ? "Апашка, 68 лет" : "Хранитель семьи",
      to: pending.recipient,
      amount: pending.amount,
      reason,
      createdLabel: `сегодня, ${formatClock(new Date()).slice(0, 5)}`,
      status: "pending",
      source: "self",
    };

    setHolds((previous) => [hold, ...previous]);
    setModal({ kind: "hold", hold });
    pushLog(
      "warn",
      `GuardPay: перевод ${formatKzt(pending.amount)} заморожен. Требуется одобрение Хранителя`,
    );
  };

  const handleTransfer = () => {
    const digits = cardValue.replace(/\D/g, "");

    if (amount < 100) {
      setFormError("Введите сумму перевода");
      pushLog("warn", "Перевод: сумма не указана");
      return;
    }
    if (amount > balance) {
      setFormError("Недостаточно средств на счете");
      pushLog("danger", "Перевод: сумма превышает доступный баланс");
      return;
    }
    if (digits.length !== 16) {
      setFormError("Введите 16 цифр карты получателя");
      pushLog("warn", "Перевод: неверный номер карты получателя");
      return;
    }

    setFormError("");
    const pending: PendingTransfer = {
      sender: role === "protected" ? "Сауле Ахметова" : "Марат Сериков",
      recipient:
        recipientMode === "trusted"
          ? "Алихан Сериков"
          : "Карта 4400 •••• 7741",
      card: cardValue,
      amount,
    };

    pushLog(
      "info",
      `Перевод ${formatKzt(amount)}: Risk Engine ${risk.score}/100 · ${risk.decision}`,
    );

    if (risk.decision === "ALLOW") {
      void finalizeTransfer(pending);
      return;
    }

    if (risk.decision === "COOL_DOWN") {
      setModal({ kind: "cooldown", pending });
      return;
    }

    if (risk.decision === "GUARDIAN_APPROVAL") {
      freezeTransfer(pending);
      return;
    }

    setModal({
      kind: "block",
      triggers: risk.weights.filter((weight) => weight.active),
      score: risk.score,
    });
    pushLog(
      "danger",
      `BLOCK: операция на ${formatKzt(amount)} остановлена до подтверждения`,
    );
  };

  /* ---- GuardPay ---------------------------------------------------------- */

  const approveHold = async (hold: HoldRequest) => {
    if (hold.status !== "pending" || role !== "guardian") return;
    setGuardError("");

    const available = hold.source === "family" ? familyBalance : balance;
    if (available < hold.amount) {
      setGuardError("Недостаточно средств на счете отправителя");
      pushLog(
        "danger",
        `GuardPay: одобрение ${formatKzt(hold.amount)} невозможно — недостаточно средств`,
      );
      return;
    }

    try {
      const receipt = await signReceipt({
        id: `BCC-${Date.now().toString().slice(-9)}`,
        timestamp: new Date().toISOString(),
        sender: hold.from,
        recipient: hold.to,
        amount: hold.amount,
      });

      if (hold.source === "family") {
        setFamilyBalance((value) => Math.max(0, value - hold.amount));
      } else {
        setBalance((value) => Math.max(0, value - hold.amount));
      }

      setHolds((previous) =>
        previous.map((item) =>
          item.id === hold.id
            ? { ...item, status: "approved", signature: receipt.signature }
            : item,
        ),
      );
      setLatestReceipt(receipt);
      setTampered(false);
      setVerifyResult(null);
      setTransfers((previous) =>
        [
          {
            id: receipt.id,
            recipient: receipt.recipient,
            amount: receipt.amount,
            timeLabel: formatDateTime(receipt.timestamp),
            status: "Одобрено Хранителем",
            signature: receipt.signature,
          },
          ...previous,
        ].slice(0, 8),
      );
      pushLog(
        "success",
        `GuardPay: Хранитель одобрил ${formatKzt(hold.amount)}. Чек ${receipt.signature}`,
      );
    } catch {
      setGuardError("Не удалось выпустить крипто-чек для одобренного перевода");
      pushLog("danger", "GuardPay: ошибка HMAC-SHA256 при одобрении перевода");
    }
  };

  const blockHold = (hold: HoldRequest) => {
    if (hold.status !== "pending" || role !== "guardian") return;
    setHolds((previous) =>
      previous.map((item) =>
        item.id === hold.id ? { ...item, status: "blocked" } : item,
      ),
    );
    setSavedTotal((value) => value + hold.amount);
    setGuardError("");
    pushLog(
      "success",
      `GuardPay: перевод ${formatKzt(hold.amount)} заблокирован. Средства спасены`,
    );
  };

  const toggleCheck = (index: number) => {
    setChecks((previous) =>
      previous.map((value, position) =>
        position === index ? !value : value,
      ),
    );
  };

  const confirmCooldown = async () => {
    if (modal.kind !== "cooldown" || !canConfirmCooldown) return;
    const pending = modal.pending;
    setModal({ kind: "none" });
    pushLog(
      "info",
      "Период охлаждения пройден. Все 3 подтверждения самопроверки получены",
    );
    await finalizeTransfer(pending);
  };

  const cancelCooldown = () => {
    setModal({ kind: "none" });
    pushLog("info", "Перевод отменен клиентом в период охлаждения");
  };

  const openGuardPayForHold = () => {
    setRole("guardian");
    setTab("guardpay");
    setModal({ kind: "none" });
    pushLog("info", "Открыт GuardPay в режиме Хранителя семьи");
  };

  /* ---- TrustLens --------------------------------------------------------- */

  const toggleTamper = () => {
    if (!latestReceipt) return;
    const next = !tampered;
    setTampered(next);
    setVerifyResult(null);
    pushLog(
      next ? "danger" : "info",
      next
        ? "TrustLens: сумма в чеке изменена вне банка, подпись оставлена исходной"
        : "TrustLens: чек восстановлен к исходным данным",
    );
  };

  const runReceiptVerification = async () => {
    if (!latestReceipt || !displayedReceipt) return;
    setVerifyLoading(true);
    try {
      const result = await verifyReceipt(
        {
          id: displayedReceipt.id,
          timestamp: displayedReceipt.timestamp,
          sender: displayedReceipt.sender,
          recipient: displayedReceipt.recipient,
          amount: displayedReceipt.amount,
        },
        latestReceipt.signature,
      );
      setVerifyResult(result);
      pushLog(
        result.isValid ? "success" : "danger",
        result.isValid
          ? "TrustLens: HMAC-SHA256 подтвердил подлинность чека"
          : "TrustLens: HMAC-SHA256 выявил подделку суммы в чеке",
      );
    } catch {
      setCryptoError(
        "Не удалось пересчитать HMAC-SHA256: Web Crypto недоступен.",
      );
      pushLog("danger", "TrustLens: ошибка криптографической проверки");
    } finally {
      setVerifyLoading(false);
    }
  };

  const copySignature = async () => {
    if (!latestReceipt) return;
    try {
      await navigator.clipboard.writeText(latestReceipt.signature);
      pushLog("success", "Подпись крипто-чека скопирована в буфер обмена");
    } catch {
      pushLog("warn", "Браузер запретил доступ к буферу обмена");
    }
  };

  /* ---- URL sandbox ------------------------------------------------------- */

  const runPhishCheck = (target?: string) => {
    const value = (target ?? phishUrl).trim();
    if (!value) {
      setPhishResult(null);
      pushLog("warn", "URL-песочница: введите ссылку для проверки");
      return;
    }
    const analysis = analyzePhishUrl(value);
    setPhishUrl(value);
    setPhishResult(analysis);
    pushLog(
      analysis.status === "phishing"
        ? "danger"
        : analysis.status === "suspicious"
          ? "warn"
          : "success",
      `URL-песочница: ${analysis.domain} → ${analysis.score}/100 · ${analysis.verdict}`,
    );
  };

  /* ---- AI Scam-Scanner --------------------------------------------------- */

  const runScamAnalysis = async () => {
    const text = scamText.trim();
    if (!text) {
      setScamError("Вставьте текст сообщения или расшифровку звонка");
      return;
    }

    setScamLoading(true);
    setScamError("");
    setScamResult(null);

    try {
      const response = await fetch("/api/scam-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error("api");

      const data = (await response.json()) as ScamAnalysis;
      if (
        typeof data.score !== "number" ||
        !Array.isArray(data.triggers) ||
        !Array.isArray(data.advice)
      ) {
        throw new Error("shape");
      }

      setScamResult(data);
      pushLog(
        data.score >= 75 ? "danger" : "info",
        `AI Scam-Scanner: ${data.score}% · ${data.category}${
          data.aiAssisted ? " · LLM + правила" : " · детерминированные правила"
        }`,
      );
    } catch {
      const local = analyzeScamText(text);
      setScamResult(local);
      setScamError(
        "Серверный анализатор недоступен — выполнен локальный разбор по матрице мошенничества РК.",
      );
      pushLog(
        "warn",
        `AI Scam-Scanner: локальный разбор ${local.score}% · ${local.category}`,
      );
    } finally {
      setScamLoading(false);
    }
  };

  const activateScannerProtection = () => {
    if (!scamResult || recentScamAlert) return;
    setRecentScamAlert(true);
    pushLog(
      "warn",
      `AI Scam-Scanner: включена повышенная защита (+25). Категория: ${scamResult.category}`,
    );
  };

  const renderModal = () => {
    if (modal.kind === "none") return null;

    if (modal.kind === "success") {
      const receipt = modal.receipt;
      return (
        <div className="absolute inset-0 z-50 overflow-y-auto bg-[#020806]/80 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Перевод проведен"
              className="w-full max-w-[330px] animate-fade-rise rounded-2xl border border-[#10B981]/35 bg-[#0B1F17] p-5 shadow-panel"
            >
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setModal({ kind: "none" })}
                  aria-label="Закрыть"
                  className="grid h-7 w-7 place-items-center rounded-md text-[#7FA793] transition-colors hover:bg-[#122B21] hover:text-[#E8F5EE]"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="-mt-2 grid h-12 w-12 place-items-center rounded-full border border-[#10B981]/35 bg-[#10B981]/12 text-[#6EE7B7]">
                <CheckCircle2 size={24} />
              </div>
              <h2 className="mt-3 text-[18px] font-medium tracking-[-0.01em]">
                Перевод проведен
              </h2>
              <p className="mt-1 text-[10.5px] leading-snug text-[#7FA793]">
                Деньги отправлены, крипто-чек подписан ключом BCC Shield 360.
              </p>

              <div className="mt-3 rounded-xl border border-[#1E4233] bg-[#06110C] px-3 py-2.5">
                <p className="font-mono text-[22px] font-medium tabular-nums text-[#E8F5EE]">
                  {formatKzt(receipt.amount)}
                </p>
                <p className="mt-0.5 text-[10px] text-[#A9CBB9]">
                  {receipt.recipient}
                </p>
              </div>

              <p className="mt-2.5 text-[8.5px] text-[#648975]">
                Цифровая подпись HMAC-SHA256
              </p>
              <p className="mt-0.5 break-all font-mono text-[10px] text-[#6EE7B7]">
                {receipt.signature}
              </p>

              <button
                type="button"
                onClick={() => {
                  setTab("trustlens");
                  setModal({ kind: "none" });
                }}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#00A859] px-3 py-2.5 text-[11px] font-semibold text-[#04130C] transition-colors hover:bg-[#10B981]"
              >
                Перейти к крипто-чеку в TrustLens
                <ArrowRight size={13} />
              </button>
              <button
                type="button"
                onClick={() => setModal({ kind: "none" })}
                className="mt-1.5 w-full rounded-lg border border-[#1E4233] px-3 py-2 text-[10.5px] text-[#A9CBB9] transition-colors hover:bg-[#122B21]"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (modal.kind === "cooldown") {
      const pending = modal.pending;
      return (
        <div className="absolute inset-0 z-50 overflow-y-auto bg-[#020806]/80 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Период охлаждения BCC SafeCall"
              className="w-full max-w-[332px] animate-fade-rise rounded-2xl border border-[#F59E0B]/40 bg-[#0B1F17] p-5 shadow-panel"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-[#F59E0B]/35 bg-[#F59E0B]/10 text-[#FCD34D]">
                  <Timer size={20} />
                </div>
                <div className="text-right">
                  <p className="font-mono text-[26px] font-medium leading-none tabular-nums text-[#FCD34D]">
                    {coolDown}
                  </p>
                  <p className="mt-0.5 text-[8.5px] text-[#7FA793]">секунд</p>
                </div>
              </div>

              <h2 className="mt-3 text-[16px] font-medium leading-tight tracking-[-0.01em]">
                Период охлаждения BCC SafeCall
              </h2>
              <p className="mt-1 text-[10px] leading-snug text-[#7FA793]">
                Операция приостановлена. Прочитайте вопросы и подтвердите,
                что вами не управляет мошенник.
              </p>

              <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-[#1E4233] bg-[#06110C] px-3 py-2">
                <span className="text-[9.5px] text-[#A9CBB9]">
                  {pending.recipient}
                </span>
                <span className="font-mono text-[12px] tabular-nums text-[#E8F5EE]">
                  {formatKzt(pending.amount)}
                </span>
              </div>

              <div className="mt-2.5 space-y-1.5">
                {COOLDOWN_CHECKS.map((check, index) => (
                  <label
                    key={check}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
                      checks[index]
                        ? "border-[#10B981]/35 bg-[#10B981]/8"
                        : "border-[#1E4233] bg-[#06110C]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checks[index]}
                      onChange={() => toggleCheck(index)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#00A859]"
                    />
                    <span className="text-[9.5px] leading-snug text-[#CFE8DC]">
                      {check}
                    </span>
                  </label>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void confirmCooldown()}
                disabled={!canConfirmCooldown}
                className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[11px] font-semibold transition-colors ${
                  canConfirmCooldown
                    ? "bg-[#00A859] text-[#04130C] hover:bg-[#10B981]"
                    : "cursor-not-allowed border border-[#1E4233] bg-[#122B21]/50 text-[#648975]"
                }`}
              >
                <Check size={13} />
                Подтвердить перевод
              </button>
              <button
                type="button"
                onClick={cancelCooldown}
                className="mt-1.5 w-full rounded-lg border border-[#1E4233] px-3 py-2 text-[10.5px] text-[#A9CBB9] transition-colors hover:bg-[#122B21]"
              >
                Отменить перевод
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (modal.kind === "hold") {
      const hold = modal.hold;
      return (
        <div className="absolute inset-0 z-50 overflow-y-auto bg-[#020806]/80 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Операция заморожена Семейным Щитом"
              className="w-full max-w-[330px] animate-fade-rise rounded-2xl border border-[#8B5CF6]/40 bg-[#0B1F17] p-5 shadow-panel"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-[#8B5CF6]/35 bg-[#8B5CF6]/10 text-[#C4B5FD]">
                <Lock size={20} />
              </div>
              <h2 className="mt-3 text-[16px] font-medium leading-tight tracking-[-0.01em]">
                Операция заморожена Семейным Щитом
              </h2>
              <p className="mt-1 text-[10px] leading-snug text-[#7FA793]">
                Требуется одобрение Хранителя семьи. Статус перевода:{" "}
                <span className="font-mono text-[#C4B5FD]">HOLD_MULTISIG</span>
              </p>

              <div className="mt-2.5 rounded-lg border border-[#1E4233] bg-[#06110C] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9.5px] text-[#A9CBB9]">
                    {hold.to}
                  </span>
                  <span className="font-mono text-[13px] tabular-nums text-[#E8F5EE]">
                    {formatKzt(hold.amount)}
                  </span>
                </div>
                <p className="mt-1.5 flex items-start gap-1 text-[8.5px] leading-snug text-[#E7C98A]">
                  <AlertTriangle size={9} className="mt-0.5 shrink-0" />
                  {hold.reason}
                </p>
              </div>

              <button
                type="button"
                onClick={openGuardPayForHold}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#00A859] px-3 py-2.5 text-[11px] font-semibold text-[#04130C] transition-colors hover:bg-[#10B981]"
              >
                Открыть GuardPay в режиме Хранителя
                <ArrowRight size={13} />
              </button>
              <button
                type="button"
                onClick={() => setModal({ kind: "none" })}
                className="mt-1.5 w-full rounded-lg border border-[#1E4233] px-3 py-2 text-[10.5px] text-[#A9CBB9] transition-colors hover:bg-[#122B21]"
              >
                Оставить в очереди
              </button>
            </div>
          </div>
        </div>
      );
    }

    const triggers = modal.triggers;
    const score = modal.score;
    return (
      <div className="absolute inset-0 z-50 overflow-y-auto bg-[#020806]/85 backdrop-blur-sm">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Операция заблокирована"
            className="w-full max-w-[332px] animate-fade-rise rounded-2xl border border-[#EF4444]/45 bg-[#0B1F17] p-5 shadow-panel"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/12 text-[#F87171]">
                <Siren size={20} />
              </div>
              <span className="rounded-md border border-[#EF4444]/40 bg-[#EF4444]/10 px-2 py-1 font-mono text-[10px] text-[#FCA5A5]">
                {score}/100 · BLOCK
              </span>
            </div>

            <h2 className="mt-3 text-[16px] font-medium leading-tight tracking-[-0.01em]">
              Операция заблокирована системой BCC Shield 360
            </h2>
            <p className="mt-1 text-[10px] leading-snug text-[#7FA793]">
              Сработала комбинация триггеров. Деньги не покинули счет.
            </p>

            <div className="mt-2.5 space-y-1">
              {triggers.map((trigger) => (
                <div
                  key={trigger.key}
                  className="flex items-start justify-between gap-2 rounded-md border border-[#EF4444]/20 bg-[#EF4444]/5 px-2 py-1.5"
                >
                  <span className="flex items-start gap-1.5 text-[9px] leading-snug text-[#FECACA]">
                    <ShieldAlert
                      size={10}
                      className="mt-0.5 shrink-0 text-[#F87171]"
                    />
                    {trigger.label}
                  </span>
                  <span className="shrink-0 font-mono text-[9px] text-[#FCA5A5]">
                    +{trigger.points}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-2.5 text-[9px] leading-snug text-[#A9CBB9]">
              Если это ошибка, позвоните в BCC по номеру с обратной стороны
              карты. Не продолжайте операцию под давлением звонящего.
            </p>

            <button
              type="button"
              onClick={resetAttack}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#00A859] px-3 py-2.5 text-[11px] font-semibold text-[#04130C] transition-colors hover:bg-[#10B981]"
            >
              <RotateCcw size={13} />
              Сбросить атаку
            </button>
            <button
              type="button"
              onClick={() => setModal({ kind: "none" })}
              className="mt-1.5 w-full rounded-lg border border-[#1E4233] px-3 py-2 text-[10.5px] text-[#A9CBB9] transition-colors hover:bg-[#122B21]"
            >
              Вернуться
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-[#06110C] text-[#E8F5EE] lg:h-auto lg:min-h-[100dvh] lg:overflow-visible">
      <button
        type="button"
        onClick={() => setJuryOpen(true)}
        className="fixed right-3 top-[max(12px,env(safe-area-inset-top))] z-40 inline-flex items-center gap-1.5 rounded-full border border-[#1E4233] bg-[#0B1F17]/95 px-3 py-1.5 text-[11px] font-medium text-[#A7F3D0] shadow-lg backdrop-blur lg:hidden"
      >
        <Zap size={12} className="text-[#34D399]" />
        ⚡ Пульт жюри
      </button>

      <div className="h-full w-full lg:mx-auto lg:flex lg:min-h-[100dvh] lg:max-w-[1500px] lg:items-center lg:justify-center lg:gap-10 lg:px-8 lg:py-4">
        <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0B1F17] lg:h-[852px] lg:w-[395px] lg:shrink-0 lg:rounded-[46px] lg:border-[10px] lg:border-[#1C2E26] lg:shadow-phone">
          {/* iOS status bar (desktop frame only) */}
          <div className="hidden shrink-0 items-center justify-between px-7 pb-1 pt-4 text-[11px] font-medium text-[#CFE8DC] lg:flex">
            <span className="tabular-nums">14:20</span>
            <span className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold">5G</span>
              <Signal size={13} strokeWidth={2.5} />
              <Wifi size={13} strokeWidth={2.5} />
              <BatteryFull size={16} strokeWidth={2.2} />
            </span>
          </div>

          <div
            className="absolute left-1/2 top-[13px] z-30 hidden h-[27px] w-[112px] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/5 lg:block"
            aria-hidden="true"
          >
            <span className="absolute right-[18px] top-1/2 h-[7px] w-[7px] -translate-y-1/2 rounded-full bg-[#0A1712] ring-1 ring-[#13241C]" />
          </div>

          <header className="relative z-10 shrink-0 px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))] lg:pt-1">
            <div className="flex items-center justify-between gap-2 pr-24 lg:pr-0">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#00A859] text-[#04130C]">
                  <ShieldCheck size={18} strokeWidth={2.3} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold tracking-[-0.01em] text-[#E8F5EE]">
                    BCC Shield 360
                  </p>
                  <p className="truncate text-[10px] text-[#7FA793]">
                    Банк ЦентрКредит
                  </p>
                </div>
              </div>
              <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-1 text-[9.5px] text-[#6EE7B7] lg:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                Защита включена
              </span>
            </div>

            <div className="mt-4 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-[22px] font-medium leading-tight tracking-[-0.02em]">
                  {SCREEN_META[tab].title}
                </h1>
                <p className="mt-0.5 truncate text-[11px] text-[#7FA793]">
                  {SCREEN_META[tab].subtitle}
                </p>
              </div>
              <RiskBadge decision={risk.decision} score={risk.score} />
            </div>
          </header>

          <main className="bcc-scroll relative flex-1 overflow-y-auto overscroll-contain px-4 pb-28 pt-1 lg:pb-24">
            {tab === "transfer" && (
              <section className="animate-fade-rise space-y-3 pb-2">
                {unverifiedCallActive && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-[#EF4444]/45 bg-[#EF4444]/10 px-3 py-2.5">
                    <PhoneOff
                      size={15}
                      className="mt-0.5 shrink-0 text-[#F87171]"
                    />
                    <p className="text-[11px] leading-snug text-[#FECACA]">
                      ⚠️ Обнаружен активный телефонный вызов с неизвестного
                      номера! Включен усиленный контроль SafeCall
                    </p>
                  </div>
                )}

                {officialBccCallActive && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-[#10B981]/40 bg-[#10B981]/10 px-3 py-2.5">
                    <Landmark
                      size={15}
                      className="mt-0.5 shrink-0 text-[#6EE7B7]"
                    />
                    <p className="text-[11px] leading-snug text-[#A7F3D0]">
                      🛡️ Верифицированный звонок BCC. Код:{" "}
                      <span className="font-mono font-medium">
                        {sessionCode}
                      </span>
                    </p>
                  </div>
                )}

                <div className="relative overflow-hidden rounded-2xl border border-[#1E4233] bg-[radial-gradient(130%_130%_at_100%_0%,#143A29_0%,#0E2A1F_58%,#0D241B_100%)] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[14px] font-semibold tracking-[-0.02em]">
                        BCC
                      </span>
                      <span className="text-[12px] text-[#A9CBB9]">Bank</span>
                    </div>
                    <span className="rounded-full border border-[#34D399]/25 bg-[#06110C]/40 px-2 py-0.5 text-[9.5px] text-[#A7F3D0]">
                      {role === "guardian"
                        ? "Владелец счета"
                        : "Защищаемый профиль: Апашка"}
                    </span>
                  </div>

                  <p className="mt-5 text-[10px] text-[#8FB6A1]">
                    Доступный баланс
                  </p>
                  <p className="mt-0.5 text-[28px] font-medium leading-none tabular-nums tracking-[-0.02em]">
                    {formatKzt(balance)}
                  </p>

                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="font-mono text-[11px] tracking-[0.06em] text-[#B8D4C5]">
                        {OWN_CARD}
                      </p>
                      <p className="mt-1 text-[9px] text-[#648975]">
                        Дебетовая карта · KZT
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[#34D399]/80">
                      <span className="h-5 w-7 rounded-[4px] border border-[#34D399]/30 bg-[#34D399]/10" />
                      <CreditCard size={18} strokeWidth={1.7} />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#1E4233] bg-[#122B21]/55 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[11px] font-medium text-[#A9CBB9]">
                      Получатель
                    </label>
                    <span
                      className={`inline-flex items-center gap-1.5 text-[9.5px] ${
                        recipientMode === "trusted"
                          ? "text-[#6EE7B7]"
                          : "text-[#FCD34D]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          recipientMode === "trusted"
                            ? "bg-[#10B981]"
                            : "bg-[#F59E0B]"
                        }`}
                      />
                      {recipientMode === "trusted"
                        ? "В доверенном круге"
                        : "Новый получатель"}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl border border-[#1E4233] bg-[#0B1F17] p-1">
                    <button
                      type="button"
                      aria-pressed={recipientMode === "trusted"}
                      onClick={() => selectRecipient("trusted")}
                      className={`rounded-lg px-2.5 py-2 text-left transition-colors ${
                        recipientMode === "trusted"
                          ? "bg-[#163527] text-[#E8F5EE] shadow-[inset_0_0_0_1px_rgba(52,211,153,0.16)]"
                          : "text-[#7FA793] hover:text-[#E8F5EE]"
                      }`}
                    >
                      <span className="block text-[11px] font-medium">
                        Доверенный контакт
                      </span>
                      <span className="mt-0.5 block text-[9.5px] text-[#7FA793]">
                        Сын Алихан
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={recipientMode === "unknown"}
                      onClick={() => selectRecipient("unknown")}
                      className={`rounded-lg px-2.5 py-2 text-left transition-colors ${
                        recipientMode === "unknown"
                          ? "bg-[#163527] text-[#E8F5EE] shadow-[inset_0_0_0_1px_rgba(52,211,153,0.16)]"
                          : "text-[#7FA793] hover:text-[#E8F5EE]"
                      }`}
                    >
                      <span className="block text-[11px] font-medium">
                        Неизвестный получатель
                      </span>
                      <span className="mt-0.5 block text-[9.5px] text-[#7FA793]">
                        Карта дроппера
                      </span>
                    </button>
                  </div>

                  <label
                    htmlFor="recipient-card"
                    className="mt-3 block text-[10px] text-[#7FA793]"
                  >
                    Карта или телефон получателя
                  </label>
                  <input
                    id="recipient-card"
                    value={cardValue}
                    onChange={(event) => handleCardChange(event.target.value)}
                    onPaste={handleCardPaste}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="4400 0000 0000 0000"
                    className="mt-1 h-11 w-full rounded-xl border border-[#1E4233] bg-[#0B1F17] px-3 font-mono text-[13px] tracking-[0.04em] text-[#E8F5EE] outline-none transition-colors placeholder:text-[#648975] focus:border-[#00A859]/70"
                  />

                  <button
                    type="button"
                    onClick={pasteFromClipboard}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/8 px-2.5 py-2 text-[10.5px] text-[#FCD34D] transition-colors hover:bg-[#F59E0B]/12"
                  >
                    <ClipboardPaste size={13} />
                    📋 Вставить карту из WhatsApp
                  </button>

                  <label
                    htmlFor="transfer-amount"
                    className="mt-3 block text-[10px] text-[#7FA793]"
                  >
                    Сумма перевода
                  </label>
                  <div className="relative mt-1 flex h-12 items-center rounded-xl border border-[#1E4233] bg-[#0B1F17] px-3 transition-colors focus-within:border-[#00A859]/70">
                    <input
                      id="transfer-amount"
                      value={
                        amountText ? formatNumber(Number(amountText)) : ""
                      }
                      onChange={(event) =>
                        handleAmountChange(event.target.value)
                      }
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="0"
                      className="h-full w-full bg-transparent pr-8 text-[22px] font-medium tabular-nums text-[#E8F5EE] outline-none"
                    />
                    <span className="absolute right-3 text-[14px] text-[#7FA793]">
                      ₸
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {[15_000, 250_000, 450_000].map((quickAmount) => (
                      <button
                        key={quickAmount}
                        type="button"
                        onClick={() => {
                          setAmountText(String(quickAmount));
                          setFormError("");
                        }}
                        className="rounded-lg border border-[#1E4233] bg-[#0B1F17] px-1 py-1.5 text-[10.5px] tabular-nums text-[#A9CBB9] transition-colors hover:border-[#34D399]/35 hover:text-[#E8F5EE]"
                      >
                        {formatNumber(quickAmount)} ₸
                      </button>
                    ))}
                  </div>

                  <div
                    className={`mt-3 flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${decisionMeta.badgeClass}`}
                  >
                    <span className="flex items-center gap-1.5 text-[10.5px]">
                      <Gauge size={13} />
                      Предрасчет риска
                    </span>
                    <span className="font-mono text-[11.5px] font-medium tabular-nums">
                      {risk.score}/100 · {decisionMeta.ru}
                    </span>
                  </div>

                  {formError && (
                    <p className="mt-2 flex items-center gap-1.5 text-[10.5px] text-[#FCA5A5]">
                      <AlertTriangle size={12} />
                      {formError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleTransfer}
                    className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#00A859] text-[14px] font-semibold text-[#04130C] transition-colors hover:bg-[#10B981] active:scale-[0.99]"
                  >
                    <Send size={16} />
                    Перевести
                  </button>
                </div>

                <div className="rounded-2xl border border-[#1E4233] bg-[#0B1F17] p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11.5px] font-medium text-[#A9CBB9]">
                      Последние операции
                    </h3>
                    <span className="font-mono text-[9.5px] text-[#648975]">
                      {transfers.length}
                    </span>
                  </div>

                  {transfers.length === 0 ? (
                    <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-dashed border-[#1E4233] px-3 py-3 text-[10.5px] text-[#7FA793]">
                      <Clock3 size={13} />
                      Проведенных операций пока нет
                    </div>
                  ) : (
                    <ul className="mt-2.5 space-y-2">
                      {transfers.map((transfer) => (
                        <li
                          key={transfer.id}
                          className="flex items-center gap-2.5"
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#122B21] text-[#34D399]">
                            <ArrowLeftRight size={13} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] text-[#E8F5EE]">
                              {transfer.recipient}
                            </p>
                            <p className="text-[9px] text-[#648975]">
                              {transfer.timeLabel} · {transfer.status}
                            </p>
                          </div>
                          <span className="shrink-0 font-mono text-[11px] tabular-nums text-[#CFE8DC]">
                            −{formatKzt(transfer.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            )}

            {tab === "trustlens" && (
              <section className="animate-fade-rise space-y-3 pb-2">
                <div
                  className={`rounded-2xl border p-4 ${
                    unverifiedCallActive
                      ? "border-[#EF4444]/45 bg-[#EF4444]/10"
                      : officialBccCallActive
                        ? "border-[#10B981]/45 bg-[#10B981]/10"
                        : "border-[#1E4233] bg-[#122B21]/45"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${
                        unverifiedCallActive
                          ? "animate-radar-pulse border-[#EF4444]/50 bg-[#EF4444]/15 text-[#F87171]"
                          : officialBccCallActive
                            ? "border-[#10B981]/45 bg-[#10B981]/15 text-[#6EE7B7]"
                            : "border-[#1E4233] bg-[#0B1F17] text-[#7FA793]"
                      }`}
                    >
                      {unverifiedCallActive ? (
                        <Siren size={18} />
                      ) : officialBccCallActive ? (
                        <BadgeCheck size={18} />
                      ) : (
                        <Shield size={18} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-[14px] font-medium">
                          Радар телефонной линии
                        </h2>
                        <span
                          className={`rounded-full border px-1.5 py-0.5 text-[8.5px] ${
                            unverifiedCallActive
                              ? "border-[#EF4444]/40 text-[#FCA5A5]"
                              : officialBccCallActive
                                ? "border-[#10B981]/40 text-[#6EE7B7]"
                                : "border-[#1E4233] text-[#7FA793]"
                          }`}
                        >
                          {unverifiedCallActive
                            ? "SIP-СПУФИНГ"
                            : officialBccCallActive
                              ? "VERIFIED"
                              : "МОНИТОРИНГ"}
                        </span>
                      </div>
                      <p
                        className={`mt-1.5 text-[11px] leading-snug ${
                          unverifiedCallActive
                            ? "text-[#FECACA]"
                            : officialBccCallActive
                              ? "text-[#A7F3D0]"
                              : "text-[#A9CBB9]"
                        }`}
                      >
                        {unverifiedCallActive
                          ? "🚨 ТРЕВОГА: Идет вызов, но сервер BCC НЕ подтверждает звонок! Это подмена номера (SIP-спуфинг). Немедленно положите трубку!"
                          : officialBccCallActive
                            ? "✅ ВЕРИФИЦИРОВАНО: С вами говорит Айгерим Садыкова (Отдел мониторинга BCC)"
                            : "Линия чиста: активных звонков от BCC нет. SIP-мониторинг работает в фоне."}
                      </p>
                    </div>
                  </div>

                  {officialBccCallActive && (
                    <div className="mt-3 rounded-xl border border-[#10B981]/30 bg-[#06110C]/70 p-3">
                      <p className="text-[9.5px] text-[#7FA793]">
                        Одноразовое кодовое слово сессии
                      </p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="font-mono text-[19px] tracking-[0.06em] text-[#6EE7B7]">
                          {sessionCode}
                        </span>
                        <button
                          type="button"
                          onClick={newSessionCode}
                          className="inline-flex items-center gap-1 rounded-md border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-1 text-[9.5px] text-[#6EE7B7] transition-colors hover:bg-[#10B981]/15"
                        >
                          <RotateCcw size={10} />
                          Новое слово
                        </button>
                      </div>
                      <p className="mt-1.5 text-[9.5px] leading-snug text-[#7FA793]">
                        Спросите оператора: «Назовите кодовое слово сессии».
                        Если слово не совпало — это мошенник.
                      </p>
                    </div>
                  )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-[#1E4233] bg-[#122B21]/55">
                  <div className="flex items-center justify-between gap-2 border-b border-[#1E4233]/70 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#0B1F17] text-[#34D399]">
                        <FileCheck2 size={15} />
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-[12.5px] font-medium">
                          Крипто-печать чека
                        </h2>
                        <p className="text-[9.5px] text-[#7FA793]">
                          HMAC-SHA256 · Web Crypto API
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-[8.5px] text-[#648975]">
                      {latestReceipt ? "SEALED" : "SIGNING"}
                    </span>
                  </div>

                  {cryptoError ? (
                    <div className="p-4">
                      <p className="flex items-start gap-2 text-[10.5px] leading-snug text-[#FCA5A5]">
                        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                        {cryptoError}
                      </p>
                    </div>
                  ) : !latestReceipt || !displayedReceipt ? (
                    <div className="flex items-center gap-2 p-5 text-[10.5px] text-[#7FA793]">
                      <Loader2 size={14} className="animate-spin" />
                      Формируем криптографическую подпись…
                    </div>
                  ) : (
                    <>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[9.5px] text-[#7FA793]">
                              Сумма по чеку
                            </p>
                            <p
                              className={`mt-1 text-[24px] font-medium leading-none tabular-nums tracking-[-0.02em] ${
                                tampered ? "text-[#FCA5A5]" : "text-[#E8F5EE]"
                              }`}
                            >
                              {formatKzt(displayedReceipt.amount)}
                            </p>
                            {tampered && (
                              <span className="mt-1.5 inline-flex rounded border border-[#F59E0B]/35 bg-[#F59E0B]/10 px-1.5 py-0.5 text-[8.5px] text-[#FCD34D]">
                                Изменено вне банка
                              </span>
                            )}
                          </div>
                          <QrGlyph seed={latestReceipt.signature} />
                        </div>

                        <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5">
                          <div>
                            <dt className="text-[8.5px] text-[#648975]">
                              Операция
                            </dt>
                            <dd className="mt-0.5 break-all font-mono text-[9.5px] text-[#CFE8DC]">
                              {displayedReceipt.id}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[8.5px] text-[#648975]">
                              Дата и время
                            </dt>
                            <dd className="mt-0.5 text-[9.5px] text-[#CFE8DC]">
                              {formatDateTime(displayedReceipt.timestamp)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[8.5px] text-[#648975]">
                              Отправитель
                            </dt>
                            <dd className="mt-0.5 text-[9.5px] text-[#CFE8DC]">
                              {displayedReceipt.sender}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[8.5px] text-[#648975]">
                              Получатель
                            </dt>
                            <dd className="mt-0.5 text-[9.5px] text-[#CFE8DC]">
                              {displayedReceipt.recipient}
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-[#34D399]/25 bg-[#06110C]/60 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-[8.5px] text-[#648975]">
                              Цифровая подпись
                            </p>
                            <p className="mt-0.5 truncate font-mono text-[10.5px] text-[#6EE7B7]">
                              {latestReceipt.signature}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={copySignature}
                            aria-label="Скопировать подпись чека"
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[#1E4233] text-[#7FA793] transition-colors hover:text-[#E8F5EE]"
                          >
                            <Copy size={12} />
                          </button>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="rotate-[-4deg] rounded-[3px] border border-[#34D399]/35 px-1.5 py-0.5 font-mono text-[7.5px] tracking-[0.13em] text-[#6EE7B7]/85">
                            BCC CRYPTO SEAL
                          </span>
                          <span className="font-mono text-[8px] text-[#648975]">
                            SHA-256 / HMAC / KZ
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 border-t border-[#1E4233]/70 p-3">
                        <button
                          type="button"
                          onClick={toggleTamper}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#F59E0B]/35 bg-[#F59E0B]/8 px-2 py-2.5 text-[10.5px] text-[#FCD34D] transition-colors hover:bg-[#F59E0B]/12"
                        >
                          🛠{" "}
                          {tampered
                            ? "Вернуть оригинальную сумму чека"
                            : "Симулировать подделку в Фотошопе (приписать «00» к сумме)"}
                        </button>
                        <button
                          type="button"
                          onClick={runReceiptVerification}
                          disabled={verifyLoading}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#34D399]/40 bg-[#34D399]/10 px-2 py-2.5 text-[10.5px] font-medium text-[#A7F3D0] transition-colors hover:bg-[#34D399]/15 disabled:opacity-60"
                        >
                          {verifyLoading ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Fingerprint size={13} />
                          )}
                          🔍{" "}
                          {verifyLoading
                            ? "Пересчитываем HMAC-SHA256…"
                            : "Запустить крипто-проверку чека"}
                        </button>
                      </div>

                      {verifyResult && (
                        <div
                          className={`mx-3 mb-3 rounded-xl border p-3 ${
                            verifyResult.isValid
                              ? "border-[#10B981]/45 bg-[#10B981]/8"
                              : "border-[#EF4444]/50 bg-[#EF4444]/10"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {verifyResult.isValid ? (
                              <CheckCircle2
                                size={16}
                                className="mt-0.5 shrink-0 text-[#6EE7B7]"
                              />
                            ) : (
                              <XCircle
                                size={16}
                                className="mt-0.5 shrink-0 text-[#F87171]"
                              />
                            )}
                            <div className="min-w-0">
                              <p
                                className={`text-[11px] font-medium ${
                                  verifyResult.isValid
                                    ? "text-[#A7F3D0]"
                                    : "text-[#FECACA]"
                                }`}
                              >
                                {verifyResult.isValid
                                  ? "✅ ЧЕК ПОДЛИННЫЙ"
                                  : "❌ ОБНАРУЖЕНА ПОДДЕЛКА"}
                              </p>
                              <p className="mt-0.5 text-[9.5px] leading-snug text-[#A9CBB9]">
                                {verifyResult.isValid
                                  ? "Цифровая подпись АО «Банк ЦентрКредит» совпала."
                                  : "Данные суммы были изменены после выпуска чека."}
                              </p>
                            </div>
                          </div>

                          <dl className="mt-3 space-y-1.5 font-mono text-[9px]">
                            <div className="flex items-start justify-between gap-2">
                              <dt className="text-[#648975]">
                                Подпись в чеке
                              </dt>
                              <dd className="text-right text-[#CFE8DC]">
                                {verifyResult.stored}
                              </dd>
                            </div>
                            <div className="flex items-start justify-between gap-2">
                              <dt className="text-[#648975]">Пересчитано</dt>
                              <dd className="text-right text-[#CFE8DC]">
                                {verifyResult.computed}
                              </dd>
                            </div>
                          </dl>
                          <p className="mt-2 break-all rounded-md bg-[#06110C]/60 px-2 py-1.5 font-mono text-[8px] leading-snug text-[#648975]">
                            {verifyResult.canonical}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}

            {tab === "guardpay" && (
              <section className="animate-fade-rise space-y-3 pb-2">
                <div className="rounded-2xl border border-[#1E4233] bg-[#122B21]/55 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[9.5px] text-[#7FA793]">
                        Семейный мультисиг
                      </p>
                      <h2 className="mt-0.5 text-[15px] font-medium">
                        Круг защиты
                      </h2>
                    </div>
                    <div className="rounded-xl border border-[#34D399]/25 bg-[#06110C]/50 px-2.5 py-1.5 text-right">
                      <p className="text-[8.5px] text-[#7FA793]">
                        Спасено от мошенников
                      </p>
                      <p className="mt-0.5 font-mono text-[12px] tabular-nums text-[#6EE7B7]">
                        {formatKzt(savedTotal)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl border border-[#1E4233] bg-[#0B1F17] p-1">
                    <button
                      type="button"
                      aria-pressed={role === "guardian"}
                      onClick={() => {
                        if (role !== "guardian") toggleRole();
                      }}
                      className={`rounded-lg px-2 py-2 text-[10.5px] font-medium transition-colors ${
                        role === "guardian"
                          ? "bg-[#163527] text-[#E8F5EE] shadow-[inset_0_0_0_1px_rgba(52,211,153,0.16)]"
                          : "text-[#7FA793] hover:text-[#E8F5EE]"
                      }`}
                    >
                      Хранитель (Марат)
                    </button>
                    <button
                      type="button"
                      aria-pressed={role === "protected"}
                      onClick={() => {
                        if (role !== "protected") toggleRole();
                      }}
                      className={`rounded-lg px-2 py-2 text-[10.5px] font-medium transition-colors ${
                        role === "protected"
                          ? "bg-[#163527] text-[#E8F5EE] shadow-[inset_0_0_0_1px_rgba(52,211,153,0.16)]"
                          : "text-[#7FA793] hover:text-[#E8F5EE]"
                      }`}
                    >
                      Апашка, 68 лет
                    </button>
                  </div>

                  <ul className="mt-2.5 space-y-1.5">
                    {RELATIVES.map((relative) => (
                      <li
                        key={relative.name}
                        className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 ${
                          relative.isApashka && role === "protected"
                            ? "border-[#8B5CF6]/40 bg-[#8B5CF6]/10"
                            : "border-transparent bg-[#0B1F17]/50"
                        }`}
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#1E4233] bg-[#122B21] font-mono text-[9.5px] text-[#A9CBB9]">
                          {relative.initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[10.5px] text-[#E8F5EE]">
                            {relative.name}
                          </p>
                          <p className="mt-0.5 text-[9px] text-[#7FA793]">
                            {relative.age} лет · лимит{" "}
                            {formatKzt(relative.limit)} в день
                          </p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 text-[8.5px] text-[#6EE7B7]">
                          <span className="h-1 w-1 rounded-full bg-[#10B981]" />
                          защита
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-[#1E4233] bg-[#0B1F17] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-[12px] font-medium">
                      Запросы на подтверждение
                    </h2>
                    <span
                      className={`rounded-full border px-2 py-0.5 font-mono text-[9px] ${
                        pendingHolds.length
                          ? "border-[#F59E0B]/35 bg-[#F59E0B]/10 text-[#FCD34D]"
                          : "border-[#1E4233] text-[#648975]"
                      }`}
                    >
                      {pendingHolds.length} · HOLD_MULTISIG
                    </span>
                  </div>

                  {guardError && (
                    <p className="mt-2 flex items-center gap-1.5 text-[10px] text-[#FCA5A5]">
                      <AlertTriangle size={11} />
                      {guardError}
                    </p>
                  )}

                  <div className="mt-2.5 space-y-2.5">
                    {holds.length === 0 && (
                      <div className="flex items-center gap-2 rounded-lg border border-dashed border-[#1E4233] px-3 py-3 text-[10.5px] text-[#7FA793]">
                        <ShieldCheck size={13} />
                        Замороженных переводов нет
                      </div>
                    )}

                    {holds.map((hold) => (
                      <div
                        key={hold.id}
                        className={`rounded-xl border p-3 ${
                          hold.status === "pending"
                            ? "border-[#F59E0B]/30 bg-[#F59E0B]/5"
                            : hold.status === "approved"
                              ? "border-[#10B981]/25 bg-[#10B981]/5"
                              : "border-[#EF4444]/25 bg-[#EF4444]/5"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] text-[#7FA793]">
                              {hold.fromAlias} → получатель
                            </p>
                            <p className="mt-0.5 truncate text-[10.5px] text-[#E8F5EE]">
                              {hold.to}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] ${
                              hold.status === "pending"
                                ? "border-[#F59E0B]/35 text-[#FCD34D]"
                                : hold.status === "approved"
                                  ? "border-[#10B981]/35 text-[#6EE7B7]"
                                  : "border-[#EF4444]/35 text-[#FCA5A5]"
                            }`}
                          >
                            {hold.status === "pending"
                              ? "НА ПОДТВЕРЖДЕНИИ"
                              : hold.status === "approved"
                                ? "ПРОВЕДЕНО"
                                : "ЗАБЛОКИРОВАНО"}
                          </span>
                        </div>

                        <p className="mt-2 font-mono text-[19px] font-medium tabular-nums text-[#E8F5EE]">
                          {formatKzt(hold.amount)}
                        </p>

                        <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-2 py-1.5">
                          <AlertTriangle
                            size={11}
                            className="mt-0.5 shrink-0 text-[#F59E0B]"
                          />
                          <p className="text-[9px] leading-snug text-[#E7C98A]">
                            {hold.reason}
                          </p>
                        </div>

                        <p className="mt-1.5 font-mono text-[8.5px] text-[#648975]">
                          {hold.createdLabel}
                          {hold.signature ? ` · ${hold.signature}` : ""}
                        </p>

                        {hold.status === "pending" &&
                          role === "guardian" && (
                            <div className="mt-2.5 space-y-1.5">
                              <button
                                type="button"
                                onClick={() => void approveHold(hold)}
                                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#00A859] px-2 py-2 text-[10px] font-semibold text-[#04130C] transition-colors hover:bg-[#10B981]"
                              >
                                <Check size={12} />
                                ✅ Одобрить и провести
                              </button>
                              <button
                                type="button"
                                onClick={() => blockHold(hold)}
                                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/10 px-2 py-2 text-[10px] font-medium text-[#FCA5A5] transition-colors hover:bg-[#EF4444]/15"
                              >
                                <Ban size={12} />
                                🛑 Заблокировать перевод (Спасти средства)
                              </button>
                            </div>
                          )}

                        {hold.status === "pending" &&
                          role === "protected" && (
                            <p className="mt-2 flex items-center gap-1.5 text-[9px] text-[#A9CBB9]">
                              <Lock size={10} />
                              Одобрение доступно Хранителю семьи
                            </p>
                          )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#1E4233] bg-[#0B1F17] p-4">
                  <div className="flex items-start gap-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#122B21] text-[#34D399]">
                      <Link2 size={15} />
                    </span>
                    <div>
                      <h2 className="text-[12px] font-medium">
                        Антифишинг-песочница
                      </h2>
                      <p className="mt-0.5 text-[9.5px] text-[#7FA793]">
                        Проверка URL перед оплатой
                      </p>
                    </div>
                  </div>

                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      runPhishCheck();
                    }}
                    className="mt-3 flex gap-1.5"
                  >
                    <input
                      value={phishUrl}
                      onChange={(event) => {
                        setPhishUrl(event.target.value);
                        setPhishResult(null);
                      }}
                      placeholder="https://example.kz/pay"
                      aria-label="Ссылка для проверки"
                      className="h-10 min-w-0 flex-1 rounded-lg border border-[#1E4233] bg-[#06110C] px-2.5 font-mono text-[10.5px] text-[#E8F5EE] outline-none transition-colors focus:border-[#00A859]/70"
                    />
                    <button
                      type="submit"
                      aria-label="Проверить ссылку"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#34D399]/35 bg-[#34D399]/10 text-[#A7F3D0] transition-colors hover:bg-[#34D399]/15"
                    >
                      <Search size={15} />
                    </button>
                  </form>

                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {PHISH_PRESETS.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => runPhishCheck(preset.url)}
                        className="flex min-w-0 items-center gap-1.5 rounded-lg border border-[#1E4233] bg-[#06110C] px-2 py-1.5 text-left transition-colors hover:border-[#34D399]/30"
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            preset.status === "safe"
                              ? "bg-[#10B981]"
                              : "bg-[#EF4444]"
                          }`}
                        />
                        <span className="truncate font-mono text-[9px] text-[#A9CBB9]">
                          {preset.url}
                        </span>
                      </button>
                    ))}
                  </div>

                  {phishResult &&
                    (() => {
                      const tone = phishTone(phishResult.status);
                      return (
                        <div
                          className={`mt-2.5 rounded-xl border p-3 ${tone.panel}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[8.5px] text-[#7FA793]">
                                Вердикт песочницы
                              </p>
                              <p
                                className={`mt-0.5 text-[12px] font-medium ${tone.text}`}
                              >
                                {phishResult.verdict}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p
                                className={`font-mono text-[26px] font-medium leading-none tabular-nums ${tone.text}`}
                              >
                                {phishResult.score}
                              </p>
                              <p className="mt-0.5 font-mono text-[8px] text-[#648975]">
                                /100
                              </p>
                            </div>
                          </div>

                          <dl className="mt-3 space-y-1.5 text-[9px]">
                            <div className="flex items-start justify-between gap-2">
                              <dt className="shrink-0 text-[#648975]">
                                Домен
                              </dt>
                              <dd className="truncate font-mono text-right text-[#CFE8DC]">
                                {phishResult.domain}
                              </dd>
                            </div>
                            <div className="flex items-start justify-between gap-2">
                              <dt className="shrink-0 text-[#648975]">
                                Возраст
                              </dt>
                              <dd className="text-right text-[#CFE8DC]">
                                {phishResult.age}
                              </dd>
                            </div>
                            <div className="flex items-start justify-between gap-2">
                              <dt className="shrink-0 text-[#648975]">SSL</dt>
                              <dd className="text-right text-[#CFE8DC]">
                                {phishResult.ssl}
                              </dd>
                            </div>
                            <div className="flex items-start justify-between gap-2">
                              <dt className="shrink-0 text-[#648975]">
                                Тайпсквоттинг
                              </dt>
                              <dd className="text-right text-[#CFE8DC]">
                                {phishResult.typosquat}
                              </dd>
                            </div>
                          </dl>

                          <ul className="mt-2.5 space-y-1">
                            {phishResult.findings.map((finding) => (
                              <li
                                key={finding}
                                className="flex items-start gap-1.5 text-[9px] leading-snug text-[#A9CBB9]"
                              >
                                <span className="mt-[4px] h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
                                {finding}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })()}
                </div>
              </section>
            )}

            {tab === "scam" && (
              <section className="animate-fade-rise space-y-3 pb-2">
                <div className="rounded-2xl border border-[#1E4233] bg-[#122B21]/55 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-[13px] font-medium">
                        Текст сообщения или звонка
                      </h2>
                      <p className="mt-0.5 text-[9.5px] text-[#7FA793]">
                        SMS, WhatsApp, Telegram или расшифровка разговора
                      </p>
                    </div>
                    <span className="rounded-md border border-[#1E4233] bg-[#0B1F17] px-1.5 py-0.5 font-mono text-[8px] text-[#648975]">
                      SCAM v2
                    </span>
                  </div>

                  <textarea
                    value={scamText}
                    onChange={(event) => {
                      setScamText(event.target.value);
                      setScamResult(null);
                      setScamError("");
                    }}
                    rows={5}
                    maxLength={8000}
                    placeholder="Вставьте подозрительное сообщение целиком. Чем больше текста, тем точнее разбор приемов давления."
                    className="bcc-scroll mt-2.5 min-h-[112px] w-full resize-y rounded-xl border border-[#1E4233] bg-[#06110C] p-3 text-[12px] leading-relaxed text-[#E8F5EE] outline-none transition-colors placeholder:text-[#648975] focus:border-[#00A859]/70"
                  />

                  <div className="mt-1 flex items-center justify-between text-[9px] text-[#648975]">
                    <span>{scamText.length} символов</span>
                    {scamText.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setScamText("");
                          setScamResult(null);
                          setScamError("");
                        }}
                        className="text-[#7FA793] transition-colors hover:text-[#E8F5EE]"
                      >
                        Очистить
                      </button>
                    )}
                  </div>

                  <div className="mt-2.5 space-y-1.5">
                    {SCAM_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setScamText(preset.text);
                          setScamResult(null);
                          setScamError("");
                        }}
                        className="w-full rounded-lg border border-[#1E4233] bg-[#0B1F17] px-2.5 py-2 text-left transition-colors hover:border-[#34D399]/30"
                      >
                        <span className="block text-[10.5px] font-medium text-[#E8F5EE]">
                          {preset.label}
                        </span>
                        <span className="mt-0.5 block text-[9px] text-[#7FA793]">
                          {preset.short}
                        </span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => void runScamAnalysis()}
                    disabled={scamLoading}
                    className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#00A859] text-[12px] font-semibold text-[#04130C] transition-colors hover:bg-[#10B981] disabled:opacity-60"
                  >
                    {scamLoading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Fingerprint size={15} />
                    )}
                    {scamLoading
                      ? "Анализируем текст…"
                      : "Анализировать через AI Scam-Scanner"}
                  </button>

                  {scamError && (
                    <p className="mt-2 flex items-start gap-1.5 text-[9.5px] leading-snug text-[#FCD34D]">
                      <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                      {scamError}
                    </p>
                  )}
                </div>

                {scamResult &&
                  (() => {
                    const tone = scamTone(scamResult.score);
                    const uniqueTriggers = Array.from(
                      new Map(
                        scamResult.triggers.map((trigger) => [
                          trigger.patternId,
                          trigger,
                        ]),
                      ).values(),
                    );
                    return (
                      <div className="animate-fade-rise rounded-2xl border border-[#1E4233] bg-[#0B1F17] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[9px] text-[#7FA793]">
                              Вероятность мошенничества
                            </p>
                            <p
                              className={`mt-0.5 font-mono text-[34px] font-medium leading-none tabular-nums ${tone.text}`}
                            >
                              {scamResult.score}
                              <span className="text-[13px] text-[#648975]">
                                %
                              </span>
                            </p>
                          </div>
                          <span
                            className={`max-w-[170px] rounded-md border px-2 py-1 text-right text-[9px] leading-snug ${tone.badge}`}
                          >
                            {scamResult.category}
                          </span>
                        </div>

                        <div className="mt-2.5 h-2 overflow-hidden rounded-full border border-[#1E4233] bg-[#06110C]">
                          <div
                            className="h-full origin-left rounded-full transition-transform duration-500"
                            style={{
                              backgroundColor: tone.hex,
                              transform: `scaleX(${scamResult.score / 100})`,
                            }}
                          />
                        </div>

                        <p
                          className={`mt-2.5 text-[11px] font-medium leading-snug ${tone.text}`}
                        >
                          {scamResult.verdict}
                        </p>
                        <p className="mt-1 text-[10px] leading-relaxed text-[#A9CBB9]">
                          {scamResult.summary}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-md border border-[#1E4233] bg-[#122B21] px-1.5 py-0.5 text-[8px] text-[#A9CBB9]">
                            {scamResult.aiAssisted
                              ? "LLM + правила"
                              : "Матрица паттернов РК"}
                          </span>
                          <span className="rounded-md border border-[#1E4233] bg-[#122B21] px-1.5 py-0.5 text-[8px] text-[#A9CBB9]">
                            {scamResult.triggers.length} триггеров
                          </span>
                        </div>

                        <div className="mt-3 rounded-xl border border-[#1E4233] bg-[#06110C] p-3">
                          <p className="text-[8.5px] text-[#648975]">
                            Подсветка триггеров прямо в тексте
                          </p>
                          <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#CFE8DC]">
                            {scamSegments.length === 0
                              ? scamText
                              : scamSegments.map((segment, index) =>
                                  segment.trigger ? (
                                    <mark
                                      key={`${segment.trigger.patternId}-${index}`}
                                      className={
                                        SEVERITY_CLASS[
                                          segment.trigger.severity
                                        ]
                                      }
                                      title={`${segment.trigger.label}: ${segment.trigger.explanation}`}
                                    >
                                      {segment.text}
                                    </mark>
                                  ) : (
                                    <span key={`plain-${index}`}>
                                      {segment.text}
                                    </span>
                                  ),
                                )}
                          </p>
                        </div>

                        {scamResult.triggers.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            <p className="text-[9px] font-medium text-[#7FA793]">
                              Найденные приемы
                            </p>
                            {uniqueTriggers.map((trigger, index) => (
                              <div
                                key={`${trigger.patternId}-${index}`}
                                className={`rounded-lg border px-2.5 py-2 ${SEVERITY_LABEL_CLASS[trigger.severity]}`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-[9.5px] font-medium">
                                    {trigger.label}
                                  </p>
                                  <span className="shrink-0 font-mono text-[8px] opacity-80">
                                    +{trigger.weight}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-[9px] text-[#CFE8DC]">
                                  «{trigger.phrase}»
                                </p>
                                <p className="mt-1 text-[9px] leading-snug text-[#A9CBB9]">
                                  {trigger.explanation}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        <ul className="mt-3 space-y-1.5">
                          {scamResult.advice.map((item) => (
                            <li
                              key={item}
                              className="flex items-start gap-1.5 text-[9.5px] leading-snug text-[#C4DDD1]"
                            >
                              <CheckCircle2
                                size={11}
                                className="mt-0.5 shrink-0 text-[#34D399]"
                              />
                              {item}
                            </li>
                          ))}
                        </ul>

                        <button
                          type="button"
                          onClick={activateScannerProtection}
                          disabled={recentScamAlert}
                          className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[10.5px] font-medium transition-colors ${
                            recentScamAlert
                              ? "border border-[#10B981]/40 bg-[#10B981]/10 text-[#A7F3D0]"
                              : "bg-[#00A859] text-[#04130C] hover:bg-[#10B981]"
                          }`}
                        >
                          {recentScamAlert ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <Zap size={14} />
                          )}
                          {recentScamAlert
                            ? "Повышенная защита активна (+25)"
                            : "⚡ Активировать повышенную защиту в Risk Engine (+25 к порогу безопасности)"}
                        </button>
                      </div>
                    );
                  })()}
              </section>
            )}
          </main>

          <nav
            aria-label="Основная навигация"
            className="absolute inset-x-0 bottom-0 z-30 border-t border-[#1E4233] bg-[#0B1F17]/95 pb-[max(6px,env(safe-area-inset-bottom))] pt-1 backdrop-blur"
          >
            <div className="grid grid-cols-4">
              {(
                [
                  {
                    id: "transfer",
                    label: "Перевод",
                    icon: ArrowLeftRight,
                  },
                  { id: "trustlens", label: "TrustLens", icon: Radar },
                  { id: "guardpay", label: "GuardPay", icon: Users },
                  {
                    id: "scam",
                    label: "Сканер",
                    icon: MessageSquareWarning,
                  },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex h-[54px] flex-col items-center justify-center gap-0.5 transition-colors ${
                      active
                        ? "text-[#6EE7B7]"
                        : "text-[#648975] hover:text-[#A9CBB9]"
                    }`}
                  >
                    <span
                      className={`relative grid h-7 w-9 place-items-center rounded-lg transition-colors ${
                        active ? "bg-[#00A859]/15" : "bg-transparent"
                      }`}
                    >
                      <Icon size={17} strokeWidth={active ? 2.3 : 1.9} />
                      {item.id === "guardpay" && pendingHolds.length > 0 && (
                        <span
                          aria-hidden="true"
                          className="absolute -right-0.5 -top-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-[#F59E0B] px-0.5 text-[7px] font-bold text-[#04130C]"
                        >
                          {pendingHolds.length}
                        </span>
                      )}
                    </span>
                    <span className="text-[8.5px] font-medium">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="pointer-events-none mx-auto mb-1 mt-0.5 hidden h-1 w-28 rounded-full bg-white/20 lg:block" />
          </nav>

          {renderModal()}
        </div>

        <aside className="hidden h-[852px] w-[480px] shrink-0 flex-col gap-3 lg:flex">
          <div className="flex items-end justify-between gap-3 px-1">
            <div>
              <p className="text-[10px] text-[#7FA793]">
                ITU Hackathon 2026 · BCC Bank
              </p>
              <h2 className="mt-1 text-[18px] font-medium tracking-[-0.01em]">
                Пульт симуляции атак
              </h2>
            </div>
            <span className="rounded-full border border-[#1E4233] bg-[#0B1F17] px-2.5 py-1 text-[9.5px] text-[#A9CBB9]">
              Telemetry Deck
            </span>
          </div>
          <div className="min-h-0 flex-1">
            <JuryPanel
              risk={risk}
              factors={factors}
              role={role}
              logs={logs}
              onToggleUnverifiedCall={toggleUnverifiedCall}
              onToggleOfficialCall={toggleOfficialCall}
              onToggleClipboard={toggleClipboard}
              onToggleRole={toggleRole}
              onStorm={activateStorm}
              onReset={resetAttack}
            />
          </div>
        </aside>
      </div>

      {juryOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            onClick={() => setJuryOpen(false)}
            aria-label="Закрыть пульт жюри"
            className="absolute inset-0 h-full w-full bg-[#020806]/80 backdrop-blur-sm"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Пульт жюри"
            className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] animate-drawer-up flex-col rounded-t-[26px] border-t border-[#1E4233] bg-[#06110C] shadow-panel"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#1E4233] px-4 py-3">
              <div className="min-w-0">
                <p className="text-[9.5px] text-[#7FA793]">
                  ITU Hackathon 2026 · BCC Bank
                </p>
                <p className="mt-0.5 truncate text-[13px] font-medium text-[#E8F5EE]">
                  Пульт симуляции атак
                </p>
              </div>
              <button
                type="button"
                onClick={() => setJuryOpen(false)}
                aria-label="Закрыть"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#1E4233] bg-[#0B1F17] text-[#A9CBB9] transition-colors hover:bg-[#122B21]"
              >
                <X size={15} />
              </button>
            </div>

            <div className="bcc-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(14px,env(safe-area-inset-bottom))]">
              <JuryPanel
                risk={risk}
                factors={factors}
                role={role}
                logs={logs}
                onToggleUnverifiedCall={toggleUnverifiedCall}
                onToggleOfficialCall={toggleOfficialCall}
                onToggleClipboard={toggleClipboard}
                onToggleRole={toggleRole}
                onStorm={activateStorm}
                onReset={resetAttack}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  View helpers                                                              */
/* -------------------------------------------------------------------------- */

function phishTone(status: PhishStatus): { panel: string; text: string } {
  if (status === "safe") {
    return {
      panel: "border-[#10B981]/40 bg-[#10B981]/10",
      text: "text-[#6EE7B7]",
    };
  }
  if (status === "suspicious") {
    return {
      panel: "border-[#F59E0B]/40 bg-[#F59E0B]/10",
      text: "text-[#FCD34D]",
    };
  }
  return {
    panel: "border-[#EF4444]/40 bg-[#EF4444]/10",
    text: "text-[#FCA5A5]",
  };
}

function scamTone(score: number): {
  text: string;
  badge: string;
  hex: string;
} {
  if (score >= 75) {
    return {
      text: "text-[#FCA5A5]",
      badge: "border-[#EF4444]/40 bg-[#EF4444]/10 text-[#FECACA]",
      hex: "#EF4444",
    };
  }
  if (score >= 45) {
    return {
      text: "text-[#FCD34D]",
      badge: "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FDE68A]",
      hex: "#F59E0B",
    };
  }
  if (score >= 30) {
    return {
      text: "text-[#C4B5FD]",
      badge: "border-[#8B5CF6]/40 bg-[#8B5CF6]/10 text-[#DDD6FE]",
      hex: "#8B5CF6",
    };
  }
  return {
    text: "text-[#6EE7B7]",
    badge: "border-[#10B981]/40 bg-[#10B981]/10 text-[#A7F3D0]",
    hex: "#10B981",
  };
}

function buildHighlightedSegments(
  text: string,
  triggers: ScamTrigger[],
): { text: string; trigger?: ScamTrigger }[] {
  if (triggers.length === 0) {
    return text ? [{ text }] : [];
  }

  const ordered = [...triggers].sort(
    (a, b) => a.start - b.start || b.end - a.end,
  );
  const segments: { text: string; trigger?: ScamTrigger }[] = [];
  let cursor = 0;

  for (const trigger of ordered) {
    if (trigger.start < cursor || trigger.end <= trigger.start) continue;
    if (trigger.start > cursor) {
      segments.push({ text: text.slice(cursor, trigger.start) });
    }
    segments.push({
      text: text.slice(trigger.start, trigger.end),
      trigger,
    });
    cursor = trigger.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments;
}



