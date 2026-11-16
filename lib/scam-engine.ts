export type ScamSeverity = "critical" | "high" | "medium";

export interface ScamTrigger {
  patternId: string;
  label: string;
  phrase: string;
  explanation: string;
  severity: ScamSeverity;
  weight: number;
  start: number;
  end: number;
}

export interface ScamAnalysis {
  score: number;
  category: string;
  summary: string;
  verdict: string;
  advice: string[];
  triggers: ScamTrigger[];
  aiAssisted: boolean;
  engine: "deterministic" | "hybrid";
}

interface ScamPattern {
  id: string;
  label: string;
  explanation: string;
  severity: ScamSeverity;
  weight: number;
  regex: RegExp;
}

/**
 * Kazakhstan-specific social-engineering matrix.
 * Each pattern is matched independently; a pattern contributes its weight
 * once no matter how many times the attacker repeats the same trick.
 */
const PATTERNS: ScamPattern[] = [
  {
    id: "authority",
    label: "Авторитет спецслужб/НБ РК",
    explanation:
      "Мошенник представляется сотрудником Нацбанка, КНБ, полиции или прокуратуры, чтобы подавить критическое мышление.",
    severity: "critical",
    weight: 30,
    regex:
      /(нацбанк[а-яё]*|национальн[а-яё]*\s+банк[а-яё]*|кнб|комитет[а-яё]*\s+национальн[а-яё]*\s+безопасност[а-яё]*|департамент[а-яё]*\s+полиции|следовател[а-яё]*|куратор[а-яё]*|прокуратур[а-яё]*|спецслужб[а-яё]*)/gi,
  },
  {
    id: "urgency",
    label: "Давление срочностью",
    explanation:
      "Искусственный дедлайн отключает возможность проверить информацию и посоветоваться с близкими.",
    severity: "high",
    weight: 15,
    regex:
      /(срочно|немедленно|прямо сейчас|в течение\s+\d+\s+минут|не откладыва[а-яё]*|сегодня же|последн[а-яё]*\s+(?:день|шанс)|только сейчас|время на исходе)/gi,
  },
  {
    id: "safe_account",
    label: "Миф о безопасном счете",
    explanation:
      "У банков и Нацбанка нет «безопасных» или «резервных» счетов. Это классическая схема вывода денег.",
    severity: "critical",
    weight: 30,
    regex:
      /(резервн[а-яё]*\s+(?:счет|счёт)|безопасн[а-яё]*\s+(?:счет|счёт)|защищенн[а-яё]*\s+(?:счет|счёт)|зеркальн[а-яё]*\s+кредит[а-яё]*|аннулирова[а-яё]*\s+заявк[а-яё]*)/gi,
  },
  {
    id: "secrecy",
    label: "Требование секретности",
    explanation:
      "Просьба скрыть разговор изолирует жертву от семьи, коллег и сотрудников банка, которые могли бы остановить перевод.",
    severity: "high",
    weight: 15,
    regex:
      /(никому не сообщай[а-яё]*|не рассказывай[а-яё]*|секретн[а-яё]*\s+проверк[а-яё]*|конфиденциальн[а-яё]*|не кладите трубку|никому не говорите)/gi,
  },
  {
    id: "otp",
    label: "Кража OTP/ЭЦП 1414",
    explanation:
      "Код из SMS, push-подтверждение и ЭЦП — это ключи от ваших денег. Сотрудник банка никогда их не запрашивает.",
    severity: "critical",
    weight: 30,
    regex:
      /(код[а-яё]*\s+(?:из\s+)?(?:sms|смс)|4-значн[а-яё]*\s+код[а-яё]*|код[а-яё]*\s+от\s+1414|\b1414\b|эцп|одноразов[а-яё]*\s+парол[а-яё]*|код[а-яё]*\s+подтверждени[а-яё]*)/gi,
  },
  {
    id: "code_request",
    label: "Запрос секретного кода",
    explanation:
      "Прямая просьба продиктовать или прислать одноразовый код означает попытку захвата счета.",
    severity: "critical",
    weight: 25,
    regex:
      /(продикту[а-яё]*|назовите[а-яё]*\s+код[а-яё]*|сообщите[а-яё]*\s+код[а-яё]*|пришлите[а-яё]*\s+код[а-яё]*|введите[а-яё]*\s+код[а-яё]*\s+на\s+сайте)/gi,
  },
  {
    id: "investment",
    label: "Нереалистичная доходность",
    explanation:
      "Гарантированные дивиденды и доходность выше рынка — признак финансовой пирамиды или инвестиционного мошенничества.",
    severity: "high",
    weight: 25,
    regex:
      /(гарантированн[а-яё]*\s+(?:дивиденд|доход|прибыл)[а-яё]*|доходност[а-яё]*|вложи[а-яё]*|инвестиц[а-яё]*|добыч[а-яё]*\s+нефт[а-яё]*|удвоени[а-яё]*|прибыл[а-яё]*\s+каждую\s+недел[а-яё]*)/gi,
  },
  {
    id: "link",
    label: "Фишинговая ссылка",
    explanation:
      "Ссылка ведет на копию банковского сайта или форму сбора карточных данных. Домены мошенников живут считанные дни.",
    severity: "high",
    weight: 15,
    regex:
      /(https?:\/\/\S+|перейд[а-яё]*\s+по\s+ссылк[а-яё]*|ссылк[а-яё]*\s+для|по\s+ссылке\s+ниже)/gi,
  },
  {
    id: "card_data",
    label: "Сбор данных карты",
    explanation:
      "CVV, срок действия и полный номер карты нужны только для кражи денег. Для зачисления достаточно номера телефона.",
    severity: "high",
    weight: 20,
    regex:
      /(cvv|cvc|номер[а-яё]*\s+карты|срок[а-яё]*\s+действия|привязк[а-яё]*\s+карты|данн[а-яё]*\s+карты|реквизит[а-яё]*\s+карты)/gi,
  },
  {
    id: "delivery",
    label: "Легенда доставки",
    explanation:
      "Посылка, курьер или переадресация — популярный повод выманить код из SMS под видом подтверждения доставки.",
    severity: "medium",
    weight: 15,
    regex:
      /(посылк[а-яё]*|курьер[а-яё]*|казпочт[а-яё]*|доставк[а-яё]*|переадрес[а-яё]*|заказн[а-яё]*)/gi,
  },
  {
    id: "payout",
    label: "Легенда госвыплаты",
    explanation:
      "«Социальные выплаты» и «компенсации от государства» используют доверие к госпрограммам для сбора данных карты.",
    severity: "medium",
    weight: 15,
    regex:
      /(социальн[а-яё]*\s+выплат[а-яё]*|компенсац[а-яё]*|государственн[а-яё]*\s+программ[а-яё]*|пособи[а-яё]*|выплат[а-яё]*\s+от\s+государства)/gi,
  },
  {
    id: "payment",
    label: "Фейковая оплата",
    explanation:
      "Требование оплатить «пошлину» или «комиссию» за несуществующую посылку или выплату — прямой признак мошенничества.",
    severity: "medium",
    weight: 15,
    regex:
      /(пошлин[а-яё]*|штраф[а-яё]*|оплат[а-яё]*\s+(?:доставки|посылки)|3d-secure|3-d\s+secure)/gi,
  },
  {
    id: "threat",
    label: "Угроза и запугивание",
    explanation:
      "Уголовное дело, арест или блокировка счета используются, чтобы вызвать страх и заставить действовать быстро.",
    severity: "high",
    weight: 20,
    regex:
      /(уголовн[а-яё]*\s+дел[а-яё]*|арест[а-яё]*|блокировк[а-яё]*\s+(?:счет|счёт)[а-яё]*|заморозк[а-яё]*\s+(?:счет|счёт)[а-яё]*|потеряете\s+деньги)/gi,
  },
  {
    id: "refund",
    label: "Легенда возврата",
    explanation:
      "Обещание вернуть деньги или посылку часто прикрывает форму, которая списывает средства с карты.",
    severity: "medium",
    weight: 10,
    regex:
      /(возврат[а-яё]*\s+(?:средств|денег|посылки)|оформлени[а-яё]*\s+возврат[а-яё]*)/gi,
  },
  {
    id: "data_confirmation",
    label: "Запрос подтверждения данных",
    explanation:
      "Просьба подтвердить личность или карту на незнакомой странице — способ собрать логин, пароль и OTP.",
    severity: "high",
    weight: 15,
    regex:
      /(подтверд[а-яё]*\s+(?:данные|личность|карту)|авторизу[а-яё]*|войдите[а-яё]*\s+в\s+личный\s+кабинет)/gi,
  },
];

const CRITICAL_ACCOUNT_SCAM = new Set([
  "authority",
  "safe_account",
  "otp",
  "code_request",
  "threat",
]);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function collectTriggers(text: string): ScamTrigger[] {
  const triggers: ScamTrigger[] = [];
  const seen = new Set<string>();

  for (const pattern of PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;
    let matchesForPattern = 0;

    while ((match = regex.exec(text)) !== null) {
      if (matchesForPattern >= 2) break;
      const phrase = match[0].trim();
      if (!phrase) continue;

      const start = match.index;
      const end = start + match[0].length;
      const spanKey = `${start}:${end}`;
      if (seen.has(spanKey)) continue;

      seen.add(spanKey);
      matchesForPattern += 1;
      triggers.push({
        patternId: pattern.id,
        label: pattern.label,
        phrase,
        explanation: pattern.explanation,
        severity: pattern.severity,
        weight: pattern.weight,
        start,
        end,
      });
    }
  }

  return triggers.sort((a, b) => a.start - b.start || a.end - b.end);
}

function pickCategory(activeIds: Set<string>, score: number): string {
  if (score < 30) return "Признаков мошенничества не найдено";

  if (
    activeIds.has("authority") &&
    (activeIds.has("safe_account") ||
      activeIds.has("secrecy") ||
      activeIds.has("threat"))
  ) {
    return "Ложный сотрудник Нацбанка или спецслужб";
  }

  if (activeIds.has("delivery") && activeIds.has("otp")) {
    return "Фишинг доставки и кража OTP";
  }

  if (activeIds.has("investment")) {
    return "Ложная инвестиционная программа";
  }

  if (activeIds.has("payout") || activeIds.has("payment")) {
    return "Фейковые выплаты и сбор платежей";
  }

  if (activeIds.has("link") || activeIds.has("card_data")) {
    return "Фишинг и кража данных карты";
  }

  if (activeIds.has("otp") || activeIds.has("code_request")) {
    return "Кража одноразовых кодов";
  }

  return "Социальная инженерия";
}

function buildAdvice(
  activeIds: Set<string>,
  score: number,
  triggerCount: number,
): string[] {
  const advice: string[] = [];

  if (score >= 45) {
    advice.push(
      "Не переводите деньги и не выполняйте указания отправителя. Завершите разговор.",
    );
    advice.push(
      "Перезвоните в BCC по номеру с обратной стороны карты или через официальное приложение.",
    );
  }

  if (activeIds.has("otp") || activeIds.has("code_request")) {
    advice.push(
      "Никому не сообщайте коды из SMS, push-подтверждения и ЭЦП. Сотрудник банка не спрашивает их никогда.",
    );
  }

  if (activeIds.has("safe_account") || activeIds.has("authority")) {
    advice.push(
      "У Нацбанка и BCC нет «безопасных» или «резервных» счетов для перевода денег.",
    );
  }

  if (activeIds.has("delivery")) {
    advice.push(
      "Проверяйте доставку только в официальном приложении или на сайте Казпочты, не по ссылке из сообщения.",
    );
  }

  if (activeIds.has("investment")) {
    advice.push(
      "Проверьте лицензию компании в реестре АРРФР. Гарантированная высокая доходность — признак пирамиды.",
    );
  }

  if (activeIds.has("payout")) {
    advice.push(
      "Государственные выплаты не требуют CVV, пароля от банкинга или оплаты «комиссии».",
    );
  }

  if (activeIds.has("link")) {
    advice.push(
      "Не открывайте ссылку. Адрес банка вводите вручную: bcc.kz.",
    );
  }

  if (score < 45) {
    advice.push(
      "Явных приемов давления не найдено. Если сообщение все равно вызывает сомнение, позвоните отправителю по известному вам номеру.",
    );
    advice.push(
      "Помните: BCC никогда не просит переводить деньги на «защищенный счет» и не спрашивает OTP.",
    );
  }

  if (triggerCount === 0) {
    advice.push(
      "Текст не содержит маркеров из матрицы мошенничества РК. Это не гарантирует безопасность отправителя.",
    );
  }

  return Array.from(new Set(advice)).slice(0, 6);
}

export function analyzeScamText(text: string): ScamAnalysis {
  const normalized = text.replace(/\r\n/g, "\n").slice(0, 8000);
  const triggers = collectTriggers(normalized);
  const activeIds = new Set(triggers.map((trigger) => trigger.patternId));
  const patternWeights = new Map<string, number>();

  for (const pattern of PATTERNS) {
    if (activeIds.has(pattern.id)) {
      patternWeights.set(pattern.id, pattern.weight);
    }
  }

  const baseScore = 2;
  const weightSum = Array.from(patternWeights.values()).reduce(
    (sum, weight) => sum + weight,
    0,
  );
  const synergy = activeIds.size >= 2 ? 15 : 0;
  const score = clamp(baseScore + weightSum + synergy, 0, 99);

  const hasCritical = triggers.some(
    (trigger) =>
      trigger.severity === "critical" && CRITICAL_ACCOUNT_SCAM.has(trigger.patternId),
  );

  let category = pickCategory(activeIds, score);
  let verdict: string;
  let summary: string;

  if (score >= 75) {
    category = hasCritical
      ? pickCategory(activeIds, score)
      : category;
    verdict = "Критический риск: сообщение написано по мошенническому сценарию";
    summary = `Найдено ${triggers.length} маркеров социальной инженерии. Сценарий давит на срочность и пытается получить деньги или секретные данные.`;
  } else if (score >= 45) {
    verdict = "Высокий риск: есть признаки целенаправленной манипуляции";
    summary = `Совокупность ${triggers.length} маркеров похожа на заготовку мошенников. Не выполняйте указания из сообщения без независимой проверки.`;
  } else if (score >= 30) {
    verdict = "Отдельные тревожные признаки";
    summary =
      "В тексте есть подозрительные формулировки, но полный мошеннический сценарий не подтвержден. Проверьте отправителя.";
  } else {
    verdict = "Похоже на легитимное сообщение";
    summary =
      "Матрица мошенничества РК не нашла давления срочностью, запросов OTP или требований перевода на «безопасный счет».";
  }

  return {
    score,
    category,
    summary,
    verdict,
    advice: buildAdvice(activeIds, score, triggers.length),
    triggers,
    aiAssisted: false,
    engine: "deterministic",
  };
}
