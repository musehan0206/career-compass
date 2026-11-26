import { CAREER_QUESTIONS, QUESTION_CATEGORIES } from '../data/questions';
import type {
  AnswerMap,
  ChatApiErrorResponse,
  ChatApiResponse,
  SubmittedAnswerItem,
} from '../types/career';

export class CareerApiError extends Error {
  status: number;
  code?: string;
  retryAfterSeconds?: number;

  constructor(
    message: string,
    status: number,
    code?: string,
    retryAfterSeconds?: number
  ) {
    super(message);
    this.name = 'CareerApiError';
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function buildSubmittedAnswers(answers: AnswerMap): SubmittedAnswerItem[] {
  const categoryMap = new Map(
    QUESTION_CATEGORIES.map((category) => [category.id, category.label])
  );

  return CAREER_QUESTIONS.map((question) => {
    const selectedIds = answers[question.id] ?? [];
    const selectedLabels = selectedIds
      .map(
        (optionId) =>
          question.options.find((option) => option.id === optionId)?.label
      )
      .filter((label): label is string => Boolean(label));

    return {
      questionId: question.id,
      number: question.number,
      category: categoryMap.get(question.categoryId) ?? question.categoryId,
      prompt: question.prompt,
      selectedLabels,
    };
  });
}

export async function requestCareerReport(
  answers: AnswerMap,
  signal?: AbortSignal
): Promise<ChatApiResponse> {
  const payload = {
    answers: buildSubmittedAnswers(answers),
  };

  let response: Response;
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new CareerApiError(
      '서버와 연결하지 못했습니다. 인터넷 연결이나 로컬 실행 상태를 확인한 뒤 다시 시도해주세요.',
      0,
      'NETWORK_ERROR'
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new CareerApiError(
      '서버 응답을 읽는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      response.status,
      'INVALID_SERVER_RESPONSE'
    );
  }

  if (!response.ok) {
    const errBody = (data ?? {}) as Partial<ChatApiErrorResponse>;
    throw new CareerApiError(
      errBody.error ||
        'AI 진로탐색 리포트를 생성하지 못했습니다. 잠시 후 다시 시도해주세요.',
      response.status,
      errBody.code,
      errBody.retryAfterSeconds
    );
  }

  const successBody = data as Partial<ChatApiResponse>;
  if (!successBody?.report) {
    throw new CareerApiError(
      '리포트 데이터가 비어 있습니다. 다시 시도해주세요.',
      502,
      'EMPTY_REPORT'
    );
  }

  return successBody as ChatApiResponse;
}

