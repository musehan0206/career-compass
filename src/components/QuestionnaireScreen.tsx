import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  HelpCircle,
} from 'lucide-react';
import { CAREER_QUESTIONS, QUESTION_CATEGORIES } from '../data/questions';
import type { AnswerMap, CareerQuestion, QuestionOption } from '../types/career';

interface QuestionnaireScreenProps {
  currentIndex: number;
  answers: AnswerMap;
  isEditingFromReview: boolean;
  onSelectAnswer: (questionId: string, selectedOptionIds: string[]) => void;
  onChangeIndex: (nextIndex: number) => void;
  onGoReview: () => void;
  onBackToStart: () => void;
}

export function QuestionnaireScreen({
  currentIndex,
  answers,
  isEditingFromReview,
  onSelectAnswer,
  onChangeIndex,
  onGoReview,
  onBackToStart,
}: QuestionnaireScreenProps) {
  const totalQuestions = CAREER_QUESTIONS.length;
  const question: CareerQuestion = CAREER_QUESTIONS[currentIndex];
  const category = QUESTION_CATEGORIES.find(
    (item) => item.id === question.categoryId
  );

  const selectedIds = answers[question.id] ?? [];
  const answeredCount = CAREER_QUESTIONS.filter(
    (q) => (answers[q.id]?.length ?? 0) > 0
  ).length;
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);
  const allAnswered = answeredCount === totalQuestions;
  const isCurrentAnswered = selectedIds.length > 0;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const maxReachedLimit =
    question.selectionMode === 'multiple' &&
    question.maxSelect !== undefined &&
    selectedIds.length >= question.maxSelect;

  function handleOptionClick(option: QuestionOption) {
    if (question.selectionMode === 'single') {
      onSelectAnswer(question.id, [option.id]);
      return;
    }

    // Multiple selection mode
    if (option.isUnsure) {
      if (selectedIds.includes(option.id)) {
        onSelectAnswer(question.id, []);
      } else {
        onSelectAnswer(question.id, [option.id]);
      }
      return;
    }

    const unsureOptionIds = new Set(
      question.options.filter((opt) => opt.isUnsure).map((opt) => opt.id)
    );
    const withoutUnsure = selectedIds.filter((id) => !unsureOptionIds.has(id));

    if (withoutUnsure.includes(option.id)) {
      onSelectAnswer(
        question.id,
        withoutUnsure.filter((id) => id !== option.id)
      );
      return;
    }

    if (
      question.maxSelect !== undefined &&
      withoutUnsure.length >= question.maxSelect
    ) {
      return;
    }

    onSelectAnswer(question.id, [...withoutUnsure, option.id]);
  }

  function handlePrevious() {
    if (currentIndex === 0) {
      onBackToStart();
      return;
    }
    onChangeIndex(currentIndex - 1);
  }

  function handleNext() {
    if (!isCurrentAnswered) return;
    if (isLastQuestion || isEditingFromReview) {
      if (allAnswered) {
        onGoReview();
        return;
      }
      if (!isLastQuestion) {
        onChangeIndex(currentIndex + 1);
      }
      return;
    }
    onChangeIndex(currentIndex + 1);
  }

  return (
    <section className="questionnaire-screen">
      {/* Top Progress & Category Stepper */}
      <div className="progress-panel">
        <div className="progress-top-row">
          <div>
            <span className="progress-label">자기이해 질문 진행률</span>
            <strong className="progress-count">
              {currentIndex + 1} / {totalQuestions} 문항
            </strong>
          </div>
          <div className="progress-right-meta">
            <span className="answered-chip">
              응답 완료 {answeredCount}/{totalQuestions}
            </span>
            <span className="progress-percent">{progressPercent}%</span>
          </div>
        </div>

        <div
          className="progress-bar-track"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="진로탐색 질문 진행률"
        >
          <div
            className="progress-bar-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="category-stepper" aria-label="5개 탐색 영역">
          {QUESTION_CATEGORIES.map((cat, idx) => {
            const firstQuestionIndex = CAREER_QUESTIONS.findIndex(
              (q) => q.categoryId === cat.id
            );
            const catQuestions = CAREER_QUESTIONS.filter(
              (q) => q.categoryId === cat.id
            );
            const catDone = catQuestions.every(
              (q) => (answers[q.id]?.length ?? 0) > 0
            );
            const isActive = cat.id === question.categoryId;
            const canJump =
              catDone ||
              firstQuestionIndex <= currentIndex ||
              (firstQuestionIndex > 0 &&
                (answers[CAREER_QUESTIONS[firstQuestionIndex - 1].id]?.length ??
                  0) > 0);

            return (
              <button
                key={cat.id}
                type="button"
                className={`category-step-pill ${isActive ? 'is-active' : ''} ${
                  catDone ? 'is-done' : ''
                }`}
                disabled={!canJump}
                onClick={() => onChangeIndex(firstQuestionIndex)}
              >
                <span className="step-num">
                  {catDone ? <Check size={12} /> : idx + 1}
                </span>
                <span>{cat.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Question Jump Dots for easy editing */}
        <div className="question-dots-row" aria-label="문항 바로가기">
          {CAREER_QUESTIONS.map((q, idx) => {
            const isAnswered = (answers[q.id]?.length ?? 0) > 0;
            const isCurrent = idx === currentIndex;
            const prevAnswered =
              idx === 0 || (answers[CAREER_QUESTIONS[idx - 1].id]?.length ?? 0) > 0;
            const canJump = isAnswered || isCurrent || prevAnswered;

            return (
              <button
                key={q.id}
                type="button"
                className={`question-dot ${isCurrent ? 'is-current' : ''} ${
                  isAnswered ? 'is-answered' : ''
                }`}
                disabled={!canJump}
                onClick={() => onChangeIndex(idx)}
                title={`${q.number}번 문항으로 이동`}
                aria-label={`${q.number}번 문항${isAnswered ? ' (응답 완료)' : ''}`}
              >
                {q.number}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Question Card */}
      <div className="question-card">
        <div className="question-card-header">
          <div className="question-badges">
            <span className="category-badge">
              {category?.label ?? question.categoryId}
            </span>
            <span className="mode-badge">
              {question.selectionMode === 'multiple'
                ? `복수 선택 (최대 ${question.maxSelect}개)`
                : '1개 선택'}
            </span>
          </div>
          <span className="question-number-tag">Q{question.number}</span>
        </div>

        <h2 className="question-prompt">{question.prompt}</h2>
        <p className="question-helper">{question.helperText}</p>

        <div
          className="options-list"
          role={question.selectionMode === 'single' ? 'radiogroup' : 'group'}
          aria-label={question.prompt}
        >
          {question.options.map((option) => {
            const isSelected = selectedIds.includes(option.id);
            const isDisabledByLimit =
              !isSelected &&
              !option.isUnsure &&
              maxReachedLimit &&
              !selectedIds.some(
                (id) => question.options.find((o) => o.id === id)?.isUnsure
              );

            return (
              <button
                key={option.id}
                type="button"
                role={question.selectionMode === 'single' ? 'radio' : 'checkbox'}
                aria-checked={isSelected}
                disabled={isDisabledByLimit}
                onClick={() => handleOptionClick(option)}
                className={`option-card ${isSelected ? 'is-selected' : ''} ${
                  option.isUnsure ? 'is-unsure' : ''
                }`}
              >
                <span className="option-indicator" aria-hidden="true">
                  {isSelected ? (
                    <Check size={15} strokeWidth={2.75} />
                  ) : option.isUnsure ? (
                    <HelpCircle size={15} />
                  ) : null}
                </span>
                <span className="option-label">{option.label}</span>
              </button>
            );
          })}
        </div>

        {question.selectionMode === 'multiple' &&
          maxReachedLimit &&
          !selectedIds.some(
            (id) => question.options.find((o) => o.id === id)?.isUnsure
          ) && (
            <p className="limit-hint">
              최대 {question.maxSelect}개까지 선택했어요. 다른 항목을 고르려면
              선택한 항목을 한 번 더 눌러 해제해주세요.
            </p>
          )}

        <div className="question-nav-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handlePrevious}
          >
            <ArrowLeft size={16} />
            <span>{currentIndex === 0 ? '시작 화면으로' : '이전 문항'}</span>
          </button>

          <div className="nav-right-group">
            {allAnswered && !isLastQuestion && (
              <button
                type="button"
                className="btn btn-outline-teal"
                onClick={onGoReview}
              >
                <ClipboardCheck size={16} />
                <span>응답 확인하기</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-primary"
              disabled={!isCurrentAnswered}
              onClick={handleNext}
            >
              <span>
                {isLastQuestion || (isEditingFromReview && allAnswered)
                  ? '응답 확인 및 리포트 받기'
                  : '다음 문항'}
              </span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

