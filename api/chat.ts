import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';
import OpenAI from 'openai';

const MODEL_NAME = 'gpt-6-luna' as const;
const REASONING_EFFORT = 'none' as const;

const MAX_BODY_BYTES = 24_000;
const EXPECTED_QUESTION_COUNT = 15;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_MINUTE = 5;
const HOURLY_WINDOW_MS = 3_600_000;
const MAX_REQUESTS_PER_HOUR = 20;
const MIN_INTERVAL_MS = 4_000;
const CACHE_TTL_MS = 60_000;
const MAX_CACHE_SIZE = 100;

interface ValidatedAnswerItem {
  questionId: string;
  number: number;
  category: string;
  prompt: string;
  selectedLabels: string[];
}

interface RecommendedField {
  fieldName: string;
  summary: string;
  reasonFromAnswers: string;
  relatedEvidence: string[];
  cautionOrNote: string;
}

interface ExplorationActivity {
  title: string;
  description: string;
  howToStart: string;
}

interface CareerReport {
  headline: string;
  traitSummary: string;
  keyCharacteristics: string[];
  recommendedFields: RecommendedField[];
  reflectionQuestions: string[];
  suggestedActivities: ExplorationActivity[];
  selfDecisionPrompt: string;
  referenceNotice: string;
}

interface RateRecord {
  minuteTimestamps: number[];
  hourTimestamps: number[];
  lastRequestAt: number;
}

interface CachedReportEntry {
  createdAt: number;
  report: CareerReport;
}

// Note: In serverless environments (e.g. Vercel), memory is per-instance and ephemeral.
// These guards stop rapid bursts and accidental duplicates on warm instances;
// for strict global rate limiting across instances, add Upstash Redis or Vercel WAF/App Check.
const ipRateStore = new Map<string, RateRecord>();
const inFlightHashes = new Set<string>();
const recentReportCache = new Map<string, CachedReportEntry>();

const REPORT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'headline',
    'traitSummary',
    'keyCharacteristics',
    'recommendedFields',
    'reflectionQuestions',
    'suggestedActivities',
    'selfDecisionPrompt',
    'referenceNotice',
  ],
  properties: {
    headline: {
      type: 'string',
      description: '학생의 응답 흐름을 따뜻하게 요약하는 한 줄 제목',
    },
    traitSummary: {
      type: 'string',
      description: '학생의 15개 응답을 종합한 관심 특성 및 성향 요약 (3~4문장)',
    },
    keyCharacteristics: {
      type: 'array',
      items: { type: 'string' },
      description: '학생의 응답에서 드러난 핵심 관심 특성 키워드/짧은 문장 3~5개',
    },
    recommendedFields: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'fieldName',
          'summary',
          'reasonFromAnswers',
          'relatedEvidence',
          'cautionOrNote',
        ],
        properties: {
          fieldName: {
            type: 'string',
            description: '특정 직업 단정이 아닌 탐색해볼 만한 관심 분야명 (예: 데이터·문제해결 융합 분야)',
          },
          summary: {
            type: 'string',
            description: '해당 관심 분야가 무엇을 다루는지 고등학생 눈높이 설명 (2~3문장)',
          },
          reasonFromAnswers: {
            type: 'string',
            description: '학생의 실제 응답을 근거로 이 분야를 제안하는 이유 (점수/백분율 금지)',
          },
          relatedEvidence: {
            type: 'array',
            items: { type: 'string' },
            description: '이 제안의 근거가 된 학생의 실제 응답 요약 2~4개 (예: "Q1: 과학 원리·AI 선택")',
          },
          cautionOrNote: {
            type: 'string',
            description: '단정적으로 보지 않고 열린 태도로 탐색할 수 있도록 돕는 한 줄 조언',
          },
        },
      },
      description: '탐색해볼 만한 관심 분야 2~3개',
    },
    reflectionQuestions: {
      type: 'array',
      items: { type: 'string' },
      description: '학생이 스스로 생각해보면 좋을 추가 탐색 질문 3~4개',
    },
    suggestedActivities: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description', 'howToStart'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          howToStart: { type: 'string' },
        },
      },
      description: '고등학생이 학교나 일상에서 스스로 시도해볼 수 있는 구체적인 진로탐색 활동 3~4개',
    },
    selfDecisionPrompt: {
      type: 'string',
      description: '학생이 스스로 다음 탐색 활동을 선택하고 결정하도록 격려하는 마무리 문구',
    },
    referenceNotice: {
      type: 'string',
      description: '정식 심리·적성검사가 아닌 자기이해 참고자료임을 알리는 안내 문구',
    },
  },
} as const;

const SYSTEM_INSTRUCTIONS = `당신은 대한민국 고등학생을 돕는 따뜻하고 균형 잡힌 자기주도 진로탐색 안내자입니다.
학생의 개인정보(이름, 학교명, 연락처 등)는 제공되지 않으며, 5개 영역(흥미, 적성, 선호하는 직업 환경, 직업 가치관, 관심 활동) 총 15개 문항의 응답만 전달됩니다.

반드시 다음 원칙을 지키세요:
1. 한국어로 친절하고 명확하며 고등학생 눈높이에 맞게 존댓말("~해요", "~해보세요")로 작성하세요. 지나치게 유아적이거나 딱딱한 어조는 피하세요.
2. 특정 직업 하나를 단정적으로 추천("당신에게 딱 맞는 직업은 OO입니다")하지 말고, 탐색할 만한 관심 분야 2~3가지를 다양한 가능성으로 제시하세요.
3. 임의의 적성 점수(예: 85점), 직업 적합도 백분율(예: 92%), 등급을 절대 만들지 마세요.
4. 모든 제안은 반드시 학생이 실제로 고른 답변을 근거로 연결해 설명하세요. "아직 잘 모르겠어요" 응답이 많다면 부족함으로 평가하지 말고, 탐색을 시작하는 자연스러운 과정으로 존중하며 폭넓은 탐색 활동과 질문을 제안하세요.
5. 확인되지 않은 특정 대학명, 학과 입시 요강, 기업명, 채용 정보, 연봉·합격선 수치를 사실처럼 제시하지 마세요.
6. 정식 심리검사나 적성검사 결과가 아니라 자기이해를 돕기 위한 참고자료임을 분명히 안내하세요.
7. 최종 결정은 학생 본인에게 있음을 강조하고, 학생이 다음 탐색 활동을 스스로 고를 수 있도록 도와주세요.
8. 각 항목은 고등학생이 한눈에 읽기 좋게 핵심 위주로 간결하고 명확하게 작성하세요.`;

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

function checkRateLimit(ip: string, now: number): { allowed: boolean; retryAfterSeconds?: number; reason?: string } {
  const existing = ipRateStore.get(ip) ?? {
    minuteTimestamps: [],
    hourTimestamps: [],
    lastRequestAt: 0,
  };

  existing.minuteTimestamps = existing.minuteTimestamps.filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  existing.hourTimestamps = existing.hourTimestamps.filter(
    (t) => now - t < HOURLY_WINDOW_MS
  );

  if (now - existing.lastRequestAt < MIN_INTERVAL_MS) {
    const waitSec = Math.ceil((MIN_INTERVAL_MS - (now - existing.lastRequestAt)) / 1000);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, waitSec),
      reason: '요청이 너무 빠릅니다. 잠시 후 다시 시도해주세요.',
    };
  }

  if (existing.minuteTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    const oldest = existing.minuteTimestamps[0];
    const waitSec = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, waitSec),
      reason: '잠시 동안 요청 횟수가 많았습니다. 1분 정도 뒤에 다시 시도해주세요.',
    };
  }

  if (existing.hourTimestamps.length >= MAX_REQUESTS_PER_HOUR) {
    const oldest = existing.hourTimestamps[0];
    const waitSec = Math.ceil((HOURLY_WINDOW_MS - (now - oldest)) / 1000);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, waitSec),
      reason: '시간당 진로 리포트 생성 횟수 제한에 도달했습니다. 잠시 후 다시 시도해주세요.',
    };
  }

  existing.minuteTimestamps.push(now);
  existing.hourTimestamps.push(now);
  existing.lastRequestAt = now;
  ipRateStore.set(ip, existing);

  // Prevent unbounded memory growth
  if (ipRateStore.size > 500) {
    for (const [key, record] of ipRateStore.entries()) {
      if (now - record.lastRequestAt > HOURLY_WINDOW_MS) {
        ipRateStore.delete(key);
      }
    }
  }

  return { allowed: true };
}

function sanitizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = Array.from(value)
    .map((ch) => {
      const code = ch.charCodeAt(0);
      return code < 32 || code === 127 ? ' ' : ch;
    })
    .join('')
    .trim();
  if (!cleaned || cleaned.length > maxLength) return null;
  return cleaned;
}

function validatePayload(body: unknown): { ok: true; answers: ValidatedAnswerItem[] } | { ok: false; message: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, message: '올바른 JSON 요청 본문이 필요합니다.' };
  }

  const record = body as Record<string, unknown>;
  const rawAnswers = record.answers;

  if (!Array.isArray(rawAnswers)) {
    return { ok: false, message: '응답 목록(answers) 형식이 올바르지 않습니다.' };
  }

  if (rawAnswers.length !== EXPECTED_QUESTION_COUNT) {
    return {
      ok: false,
      message: `모든 ${EXPECTED_QUESTION_COUNT}개 문항에 응답한 뒤 요청해주세요.`,
    };
  }

  const seenIds = new Set<string>();
  const validated: ValidatedAnswerItem[] = [];

  for (const item of rawAnswers) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { ok: false, message: '문항 응답 항목 형식이 올바르지 않습니다.' };
    }

    const row = item as Record<string, unknown>;
    const questionId = sanitizeText(row.questionId, 10);
    if (!questionId || !/^q([1-9]|1[0-5])$/.test(questionId)) {
      return { ok: false, message: '유효하지 않은 문항 번호가 포함되어 있습니다.' };
    }

    if (seenIds.has(questionId)) {
      return { ok: false, message: '중복된 문항 응답이 포함되어 있습니다.' };
    }
    seenIds.add(questionId);

    const numberValue = Number(row.number);
    if (!Number.isInteger(numberValue) || numberValue < 1 || numberValue > EXPECTED_QUESTION_COUNT) {
      return { ok: false, message: '문항 순서 값이 올바르지 않습니다.' };
    }

    const category = sanitizeText(row.category, 40);
    const prompt = sanitizeText(row.prompt, 250);
    if (!category || !prompt) {
      return { ok: false, message: '문항 영역 또는 질문 내용이 유효하지 않습니다.' };
    }

    if (!Array.isArray(row.selectedLabels) || row.selectedLabels.length === 0 || row.selectedLabels.length > 3) {
      return { ok: false, message: `${questionId} 문항의 선택 개수가 유효하지 않습니다.` };
    }

    const selectedLabels: string[] = [];
    for (const label of row.selectedLabels) {
      const cleanLabel = sanitizeText(label, 120);
      if (!cleanLabel) {
        return { ok: false, message: `${questionId} 문항의 선택지 내용이 유효하지 않습니다.` };
      }
      selectedLabels.push(cleanLabel);
    }

    validated.push({
      questionId,
      number: numberValue,
      category,
      prompt,
      selectedLabels,
    });
  }

  validated.sort((a, b) => a.number - b.number);
  return { ok: true, answers: validated };
}

function buildPayloadHash(answers: ValidatedAnswerItem[]): string {
  return createHash('sha256').update(JSON.stringify(answers)).digest('hex');
}

function formatAnswersForPrompt(answers: ValidatedAnswerItem[]): string {
  const lines = answers.map(
    (item) =>
      `[Q${item.number} · ${item.category}] ${item.prompt}\n→ 학생 선택: ${item.selectedLabels.join(' / ')}`
  );
  return `아래는 고등학생이 자기이해 15문항에 응답한 결과입니다.\n\n${lines.join('\n\n')}`;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => isNonEmptyString(item))
  );
}

function isValidReport(data: unknown): data is CareerReport {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const r = data as Record<string, unknown>;

  if (
    !isNonEmptyString(r.headline) ||
    !isNonEmptyString(r.traitSummary) ||
    !isNonEmptyStringArray(r.keyCharacteristics) ||
    !isNonEmptyStringArray(r.reflectionQuestions) ||
    !isNonEmptyString(r.selfDecisionPrompt) ||
    !isNonEmptyString(r.referenceNotice)
  ) {
    return false;
  }

  if (!Array.isArray(r.recommendedFields) || r.recommendedFields.length < 2) {
    return false;
  }

  for (const field of r.recommendedFields) {
    if (!field || typeof field !== 'object' || Array.isArray(field)) return false;
    const f = field as Record<string, unknown>;
    if (
      !isNonEmptyString(f.fieldName) ||
      !isNonEmptyString(f.summary) ||
      !isNonEmptyString(f.reasonFromAnswers) ||
      !isNonEmptyStringArray(f.relatedEvidence) ||
      !isNonEmptyString(f.cautionOrNote)
    ) {
      return false;
    }
  }

  if (!Array.isArray(r.suggestedActivities) || r.suggestedActivities.length === 0) {
    return false;
  }

  for (const activity of r.suggestedActivities) {
    if (!activity || typeof activity !== 'object' || Array.isArray(activity)) return false;
    const a = activity as Record<string, unknown>;
    if (
      !isNonEmptyString(a.title) ||
      !isNonEmptyString(a.description) ||
      !isNonEmptyString(a.howToStart)
    ) {
      return false;
    }
  }

  return true;
}

function extractResponseText(response: OpenAI.Responses.Response): {
  text: string;
  refusal?: string;
} {
  const directText = response.output_text?.trim();
  if (directText) {
    return { text: directText };
  }

  const textParts: string[] = [];
  let refusalText: string | undefined;

  for (const item of response.output ?? []) {
    if (item.type !== 'message') continue;
    for (const part of item.content ?? []) {
      if (part.type === 'output_text' && part.text) {
        textParts.push(part.text);
      } else if (part.type === 'refusal' && part.refusal) {
        refusalText = part.refusal;
      }
    }
  }

  return {
    text: textParts.join('').trim(),
    refusal: refusalText,
  };
}

function stripJsonCodeFence(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  return trimmed;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      error: '허용되지 않은 요청 방식입니다. POST 요청만 지원합니다.',
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  const contentLength = Number(req.headers['content-length'] ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return res.status(413).json({
      error: '요청 데이터 크기가 허용 한도를 초과했습니다.',
      code: 'PAYLOAD_TOO_LARGE',
    });
  }

  let parsedBody: unknown = req.body;
  if (typeof parsedBody === 'string') {
    if (Buffer.byteLength(parsedBody, 'utf8') > MAX_BODY_BYTES) {
      return res.status(413).json({
        error: '요청 데이터 크기가 허용 한도를 초과했습니다.',
        code: 'PAYLOAD_TOO_LARGE',
      });
    }
    try {
      parsedBody = JSON.parse(parsedBody);
    } catch {
      return res.status(400).json({
        error: '요청 본문을 JSON으로 해석할 수 없습니다.',
        code: 'INVALID_JSON',
      });
    }
  }

  if (parsedBody && Buffer.byteLength(JSON.stringify(parsedBody), 'utf8') > MAX_BODY_BYTES) {
    return res.status(413).json({
      error: '요청 데이터 크기가 허용 한도를 초과했습니다.',
      code: 'PAYLOAD_TOO_LARGE',
    });
  }

  const validation = validatePayload(parsedBody);
  if ('message' in validation) {
    return res.status(400).json({
      error: validation.message,
      code: 'VALIDATION_ERROR',
    });
  }

  const now = Date.now();
  const payloadHash = buildPayloadHash(validation.answers);

  // Serve short-lived cached report for accidental duplicate submits
  const cached = recentReportCache.get(payloadHash);
  if (cached && now - cached.createdAt < CACHE_TTL_MS) {
    return res.status(200).json({
      report: cached.report,
      meta: {
        model: MODEL_NAME,
        reasoningEffort: REASONING_EFFORT,
        cached: true,
      },
    });
  }

  if (inFlightHashes.has(payloadHash)) {
    return res.status(429).json({
      error: '동일한 응답에 대한 진로 리포트를 이미 생성하고 있습니다. 잠시만 기다려주세요.',
      code: 'DUPLICATE_IN_FLIGHT',
      retryAfterSeconds: 5,
    });
  }

  const clientIp = getClientIp(req);
  const rateCheck = checkRateLimit(clientIp, now);
  if (!rateCheck.allowed) {
    if (rateCheck.retryAfterSeconds) {
      res.setHeader('Retry-After', String(rateCheck.retryAfterSeconds));
    }
    return res.status(429).json({
      error: rateCheck.reason ?? '요청이 너무 많습니다.',
      code: 'RATE_LIMITED',
      retryAfterSeconds: rateCheck.retryAfterSeconds,
    });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({
      error:
        '서버에 OpenAI API 키(OPENAI_API_KEY)가 설정되지 않았습니다. .env.local 또는 Vercel 환경 변수를 확인해주세요.',
      code: 'MISSING_API_KEY',
    });
  }

  const client = new OpenAI({
    apiKey,
    timeout: 45_000,
    maxRetries: 1,
  });

  inFlightHashes.add(payloadHash);

  try {
    const response = await client.responses.create({
      model: MODEL_NAME,
      reasoning: {
        effort: REASONING_EFFORT,
      },
      instructions: SYSTEM_INSTRUCTIONS,
      input: formatAnswersForPrompt(validation.answers),
      max_output_tokens: 4096,
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: 'career_compass_report',
          strict: true,
          schema: REPORT_JSON_SCHEMA,
        },
      },
    });

    if (response.error) {
      return res.status(502).json({
        error: 'AI 모델이 응답을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        code: 'OPENAI_RESPONSE_ERROR',
      });
    }

    if (response.status === 'incomplete') {
      const reason = response.incomplete_details?.reason;
      const message =
        reason === 'max_output_tokens'
          ? 'AI 리포트 응답이 길어 중간에 잘렸습니다. 다시 시도해주세요.'
          : 'AI 리포트 응답이 끝까지 완료되지 않았습니다. 다시 시도해주세요.';
      return res.status(502).json({
        error: message,
        code: 'AI_RESPONSE_INCOMPLETE',
      });
    }

    if (response.status && response.status !== 'completed') {
      return res.status(502).json({
        error: 'AI 리포트 생성이 완료되지 않았습니다. 잠시 후 다시 시도해주세요.',
        code: 'AI_RESPONSE_NOT_COMPLETED',
      });
    }

    const { text: extractedText, refusal } = extractResponseText(response);
    if (refusal) {
      return res.status(502).json({
        error: '요청을 처리할 수 있는 리포트를 생성하지 못했습니다. 응답 내용을 확인한 뒤 다시 시도해주세요.',
        code: 'AI_RESPONSE_REFUSAL',
      });
    }

    const rawOutput = stripJsonCodeFence(extractedText);
    if (!rawOutput) {
      return res.status(502).json({
        error: 'AI 응답에서 결과 텍스트를 받지 못했습니다. 잠시 후 다시 시도해주세요.',
        code: 'EMPTY_AI_RESPONSE',
      });
    }

    let parsedReport: unknown;
    try {
      parsedReport = JSON.parse(rawOutput);
    } catch {
      return res.status(502).json({
        error: 'AI 응답 형식을 해석하는 중 문제가 발생했습니다. 다시 시도해주세요.',
        code: 'INVALID_AI_JSON',
      });
    }

    if (!isValidReport(parsedReport)) {
      return res.status(502).json({
        error: 'AI 진로탐색 리포트 형식이 완전하지 않습니다. 다시 시도해주세요.',
        code: 'INCOMPLETE_AI_REPORT',
      });
    }

    recentReportCache.set(payloadHash, {
      createdAt: Date.now(),
      report: parsedReport,
    });

    if (recentReportCache.size > MAX_CACHE_SIZE) {
      const oldestKey = recentReportCache.keys().next().value;
      if (oldestKey) {
        recentReportCache.delete(oldestKey);
      }
    }

    return res.status(200).json({
      report: parsedReport,
      meta: {
        model: MODEL_NAME,
        reasoningEffort: REASONING_EFFORT,
        requestId: response.id,
      },
    });
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      const status = error.status ?? 502;
      if (status === 401) {
        return res.status(502).json({
          error: 'OpenAI API 키 인증에 실패했습니다. 서버에 설정된 OPENAI_API_KEY를 확인해주세요.',
          code: 'OPENAI_AUTH_ERROR',
        });
      }
      if (status === 429) {
        return res.status(429).json({
          error: '현재 OpenAI API 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.',
          code: 'OPENAI_RATE_LIMIT',
        });
      }
      if (status === 400 || status === 404) {
        return res.status(502).json({
          error: `AI 모델(${MODEL_NAME}) 요청 처리 중 오류가 발생했습니다: ${error.message}`,
          code: 'OPENAI_BAD_REQUEST',
        });
      }
    }

    return res.status(502).json({
      error: 'AI 진로탐색 리포트를 생성하는 중 연결 오류가 발생했습니다. 네트워크 상태와 API 설정을 확인한 뒤 다시 시도해주세요.',
      code: 'OPENAI_REQUEST_FAILED',
    });
  } finally {
    inFlightHashes.delete(payloadHash);
  }
}
