import { NextResponse } from "next/server";
import {
  analyzeScamText,
  type PiiFinding,
  type ScamAnalysis,
} from "@/lib/scam-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AiAssessment {
  score?: unknown;
  category?: unknown;
  summary?: unknown;
  verdict?: unknown;
}

function clampScore(value: number): number {
  return Math.min(99, Math.max(0, Math.round(value)));
}

function mergeAiAssessment(
  base: ScamAnalysis,
  assessment: AiAssessment,
): ScamAnalysis {
  const aiScore =
    typeof assessment.score === "number" && Number.isFinite(assessment.score)
      ? clampScore(assessment.score)
      : base.score;

  const category =
    typeof assessment.category === "string" && assessment.category.trim()
      ? assessment.category.trim().slice(0, 160)
      : base.category;

  const summary =
    typeof assessment.summary === "string" && assessment.summary.trim()
      ? assessment.summary.trim().slice(0, 600)
      : base.summary;

  const verdict =
    typeof assessment.verdict === "string" && assessment.verdict.trim()
      ? assessment.verdict.trim().slice(0, 240)
      : base.verdict;

  return {
    ...base,
    score: Math.max(base.score, aiScore),
    category,
    summary,
    verdict,
    aiAssisted: true,
    engine: "hybrid",
  };
}

function sanitizePii(value: unknown): PiiFinding[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (
      typeof item === "object" &&
      item !== null &&
      (item as PiiFinding).type !== undefined &&
      typeof (item as PiiFinding).label === "string" &&
      typeof (item as PiiFinding).count === "number"
    ) {
      const finding = item as PiiFinding;
      if (finding.type !== "iin" && finding.type !== "card") return [];
      return [
        {
          type: finding.type,
          label: finding.label,
          count: Math.max(0, Math.round(finding.count)),
        },
      ];
    }
    return [];
  });
}

export async function POST(request: Request) {
  let text = "";

  try {
    const body = (await request.json()) as { text?: unknown };
    text = typeof body.text === "string" ? body.text.trim() : "";
  } catch {
    return NextResponse.json(
      { error: "Некорректный JSON в запросе" },
      { status: 400 },
    );
  }

  if (!text) {
    return NextResponse.json(
      { error: "Передайте текст сообщения или расшифровку звонка" },
      { status: 400 },
    );
  }

  if (text.length > 8000) {
    return NextResponse.json(
      { error: "Текст длиннее 8000 символов" },
      { status: 413 },
    );
  }

  /*
   * Deterministic analysis always runs first. It performs the on-device PII
   * scrub and returns `maskedText`; the raw IIN/PAN never reaches the LLM.
   */
  const deterministic = analyzeScamText(text);
  const safeText = deterministic.maskedText;
  const pii = sanitizePii(deterministic.pii);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ ...deterministic, pii });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Ты антифрод-аналитик Банка ЦентрКредит (Казахстан). Оцени текст на социальную инженерию по матрице мошенничества РК: ложные сотрудники Нацбанка/КНБ/полиции, «безопасный счет», кража OTP 1414 и ЭЦП, фишинг доставки, лже-инвестиции, фейковые госвыплаты, зеркальный кредит, карта дроппера. Токены [ИИН СКРЫТ ЗАЩИТОЙ ПДн РК] и [КАРТА СКРЫТА] — это уже обезличенные персональные данные, не пытайся их восстановить. Верни строго JSON без markdown: {\"score\": число 0-99, \"category\": краткая категория атаки, \"summary\": 1-2 предложения, \"verdict\": короткий вердикт}. Не занижай риск при наличии запроса секретных данных или перевода денег. Не добавляй поля.",
          },
          {
            role: "user",
            content: `Текст для анализа (PII уже обезличены на устройстве):\n"""${safeText}"""`,
          },
        ],
      }),
      signal: AbortSignal.timeout(9000),
    });

    if (!response.ok) {
      return NextResponse.json(deterministic);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content;

    if (!raw) {
      return NextResponse.json(deterministic);
    }

    const assessment = JSON.parse(raw) as AiAssessment;
    return NextResponse.json(mergeAiAssessment(deterministic, assessment));
  } catch {
    // Any network, timeout, quota or parsing failure falls back to the
    // deterministic engine. The demo must never depend on the LLM being up.
    return NextResponse.json(deterministic);
  }
}

export async function GET() {
  return NextResponse.json(
    {
      service: "BCC Shield 360 — AI Scam-Scanner",
      method: "POST",
      body: { text: "string" },
      engine: process.env.OPENAI_API_KEY ? "hybrid" : "deterministic",
      privacy:
        "On-device PII scrubber masks 12-digit IIN and 16-digit card PAN before any LLM call.",
    },
    { status: 200 },
  );
}
