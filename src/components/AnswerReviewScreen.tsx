import { ArrowLeft, Edit3, Sparkles } from 'lucide-react';
import { CAREER_QUESTIONS, QUESTION_CATEGORIES } from '../data/questions';
import type { AnswerMap } from '../types/career';

interface AnswerReviewScreenProps {
  answers: AnswerMap;
  onEditQuestion: (questionIndex: number) => void;
  onBackToLastQuestion: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function AnswerReviewScreen({
  answers,
  onEditQuestion,
  onBackToLastQuestion,
  onSubmit,
  isSubmitting,
}: AnswerReviewScreenProps) {
  return (
    <section className="review-screen">
      <div className="review-header-card">
        <div>
          <span className="category-badge">응답 최종 확인</span>
          <h2>15개 질문 응답을 한눈에 확인해보세요</h2>
          <p>
            수정이 필요한 문항이 있다면 <strong>수정</strong> 버튼을 눌러 바로
            바꿀 수 있습니다. 확인이 끝났다면 아래 버튼을 눌러 AI 진로탐색
            리포트를 받아보세요.
          </p>
        </div>

        <div className="review-top-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onBackToLastQuestion}
            disabled={isSubmitting}
          >
            <ArrowLeft size={16} />
            <span>질문으로 돌아가기</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            <Sparkles size={18} />
            <span>AI 진로탐색 리포트 받기</span>
          </button>
        </div>
      </div>

      <div className="review-groups">
        {QUESTION_CATEGORIES.map((category) => {
          const categoryQuestions = CAREER_QUESTIONS.filter(
            (q) => q.categoryId === category.id
          );

          return (
            <div key={category.id} className="review-category-card">
              <div className="review-category-head">
                <h3>{category.label}</h3>
                <span>{category.description}</span>
              </div>

              <div className="review-items">
                {categoryQuestions.map((question) => {
                  const questionIndex = CAREER_QUESTIONS.findIndex(
                    (item) => item.id === question.id
                  );
                  const selectedIds = answers[question.id] ?? [];
                  const selectedLabels = selectedIds
                    .map(
                      (id) =>
                        question.options.find((opt) => opt.id === id)?.label
                    )
                    .filter((label): label is string => Boolean(label));

                  return (
                    <div key={question.id} className="review-item-row">
                      <div className="review-item-body">
                        <div className="review-item-title">
                          <span className="review-q-num">Q{question.number}</span>
                          <span>{question.prompt}</span>
                        </div>
                        <div className="review-selected-chips">
                          {selectedLabels.map((label) => (
                            <span key={label} className="selected-answer-chip">
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm review-edit-btn"
                        onClick={() => onEditQuestion(questionIndex)}
                        disabled={isSubmitting}
                      >
                        <Edit3 size={14} />
                        <span>수정</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="review-bottom-cta">
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          <Sparkles size={18} />
          <span>AI 진로탐색 리포트 만들기</span>
        </button>
      </div>
    </section>
  );
}

