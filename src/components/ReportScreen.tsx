import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Edit3,
  HelpCircle,
  Info,
  Lightbulb,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { CAREER_QUESTIONS } from '../data/questions';
import type { AnswerMap, CareerReport } from '../types/career';
import { LoadingReportView } from './LoadingReportView';

interface ReportScreenProps {
  isLoading: boolean;
  error: string | null;
  report: CareerReport | null;
  answers: AnswerMap;
  onRetry: () => void;
  onBackToReview: () => void;
  onRestart: () => void;
}

export function ReportScreen({
  isLoading,
  error,
  report,
  answers,
  onRetry,
  onBackToReview,
  onRestart,
}: ReportScreenProps) {
  const [selectedActivityIndices, setSelectedActivityIndices] = useState<
    number[]
  >([]);
  const [showAnswersSummary, setShowAnswersSummary] = useState(false);

  if (isLoading) {
    return <LoadingReportView />;
  }

  if (error || !report) {
    return (
      <section className="error-screen" role="alert">
        <div className="error-card">
          <div className="error-icon-wrap">
            <AlertCircle size={36} />
          </div>
          <h2>AI 진로탐색 리포트를 불러오지 못했어요</h2>
          <p className="error-message">
            {error ??
              '일시적인 오류로 리포트를 생성하지 못했습니다. 잠시 후 다시 시도해주세요.'}
          </p>
          <p className="error-honesty-note">
            정확한 자기이해 분석을 위해 연결 실패 시 임의의 가짜 결과를 표시하지
            않습니다. 응답 내용은 그대로 보존되어 있어요.
          </p>
          <div className="error-actions">
            <button type="button" className="btn btn-primary" onClick={onRetry}>
              <RefreshCw size={16} />
              <span>다시 시도하기</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onBackToReview}
            >
              <Edit3 size={16} />
              <span>응답 확인·수정하기</span>
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onRestart}
            >
              <RotateCcw size={16} />
              <span>처음부터 다시 탐색하기</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  function toggleActivity(index: number) {
    setSelectedActivityIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  }

  return (
    <section className="report-screen">
      {/* Report Hero Summary */}
      <div className="report-hero-card">
        <div className="report-hero-badge">
          <Compass size={15} />
          <span>AI 자기이해 진로탐색 리포트</span>
        </div>
        <h1 className="report-headline">{report.headline}</h1>
        <p className="report-trait-summary">{report.traitSummary}</p>

        <div className="report-characteristics">
          <span className="characteristics-label">응답에서 발견한 관심 특성</span>
          <div className="characteristics-chips">
            {report.keyCharacteristics.map((trait) => (
              <span key={trait} className="trait-chip">
                <Sparkles size={13} />
                <span>{trait}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 1. Recommended Fields (2~3) */}
      <div className="report-section">
        <div className="report-section-header">
          <div className="section-title-row">
            <Compass size={20} className="section-accent-icon" />
            <h2>탐색해볼 만한 관심 분야</h2>
          </div>
          <p>
            특정 직업을 단정하지 않고, 내가 고른 답변을 바탕으로 넓게 살펴볼
            수 있는 {report.recommendedFields.length}가지 방향을 제안해요.
          </p>
        </div>

        <div className="fields-grid">
          {report.recommendedFields.map((field, index) => (
            <article key={field.fieldName} className="field-card">
              <div className="field-card-top">
                <span className="field-index">탐색 방향 {index + 1}</span>
                <h3>{field.fieldName}</h3>
                <p className="field-summary">{field.summary}</p>
              </div>

              <div className="field-reason-box">
                <h4>왜 이 분야를 제안했나요?</h4>
                <p>{field.reasonFromAnswers}</p>
              </div>

              <div className="field-evidence-box">
                <h4>근거가 된 나의 응답</h4>
                <ul>
                  {field.relatedEvidence.map((evidence) => (
                    <li key={evidence}>{evidence}</li>
                  ))}
                </ul>
              </div>

              <div className="field-caution">
                <Info size={15} />
                <span>{field.cautionOrNote}</span>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* 2. Reflection Questions */}
      <div className="report-section">
        <div className="report-section-header">
          <div className="section-title-row">
            <HelpCircle size={20} className="section-accent-icon" />
            <h2>스스로에게 던져볼 추가 탐색 질문</h2>
          </div>
          <p>
            정답이 정해진 질문이 아니에요. 떠오르는 생각이나 경험을 메모하며
            내 마음을 더 자세히 들여다보세요.
          </p>
        </div>

        <div className="reflection-list">
          {report.reflectionQuestions.map((question, idx) => (
            <div key={question} className="reflection-card">
              <span className="reflection-num">질문 {idx + 1}</span>
              <p>{question}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Suggested Activities + Self-Selection */}
      <div className="report-section">
        <div className="report-section-header">
          <div className="section-title-row">
            <Lightbulb size={20} className="section-accent-icon" />
            <h2>지금 시도해볼 수 있는 진로탐색 활동</h2>
          </div>
          <p>
            아래 활동 중 <strong>직접 해보고 싶은 활동</strong>을 눌러
            선택해보세요. 진로의 방향은 내가 직접 경험하며 결정할 때 가장
            선명해집니다.
          </p>
        </div>

        <div className="activities-grid">
          {report.suggestedActivities.map((activity, idx) => {
            const isPicked = selectedActivityIndices.includes(idx);
            return (
              <button
                key={activity.title}
                type="button"
                onClick={() => toggleActivity(idx)}
                aria-pressed={isPicked}
                className={`activity-card ${isPicked ? 'is-picked' : ''}`}
              >
                <div className="activity-card-head">
                  <span className="activity-pick-badge">
                    <CheckCircle2 size={16} />
                    <span>{isPicked ? '내가 고른 다음 활동' : '활동 선택하기'}</span>
                  </span>
                </div>
                <h3>{activity.title}</h3>
                <p className="activity-desc">{activity.description}</p>
                <div className="activity-start">
                  <strong>시작 팁</strong>
                  <span>{activity.howToStart}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="self-decision-box">
          <div className="self-decision-text">
            <strong>나의 다음 한 걸음</strong>
            <p>{report.selfDecisionPrompt}</p>
          </div>
          {selectedActivityIndices.length > 0 && (
            <div className="picked-summary">
              <span>내가 선택한 활동 ({selectedActivityIndices.length}개):</span>
              <div className="picked-tags">
                {selectedActivityIndices.map((idx) => (
                  <span key={idx} className="picked-tag">
                    {report.suggestedActivities[idx]?.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Collapsible My Answers Summary */}
      <div className="answers-accordion">
        <button
          type="button"
          className="accordion-toggle"
          onClick={() => setShowAnswersSummary((prev) => !prev)}
          aria-expanded={showAnswersSummary}
        >
          <span>내가 입력한 15개 응답 다시 보기</span>
          {showAnswersSummary ? (
            <ChevronUp size={18} />
          ) : (
            <ChevronDown size={18} />
          )}
        </button>

        {showAnswersSummary && (
          <div className="accordion-body">
            {CAREER_QUESTIONS.map((q) => {
              const chosen = (answers[q.id] ?? [])
                .map((id) => q.options.find((opt) => opt.id === id)?.label)
                .filter((label): label is string => Boolean(label));
              return (
                <div key={q.id} className="accordion-answer-row">
                  <div className="accordion-q">
                    <strong>Q{q.number}.</strong> {q.prompt}
                  </div>
                  <div className="accordion-a">{chosen.join(' · ')}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Reference Disclaimer */}
      <div className="notice-banner report-disclaimer">
        <Info size={20} className="notice-icon" />
        <div className="notice-text">
          <strong>참고자료 안내</strong>
          <p>{report.referenceNotice}</p>
        </div>
      </div>

      {/* 6. Bottom Actions */}
      <div className="report-footer-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onBackToReview}
        >
          <Edit3 size={16} />
          <span>응답 수정하고 다시 분석하기</span>
        </button>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={onRestart}
        >
          <RotateCcw size={17} />
          <span>처음부터 다시 탐색하기</span>
        </button>
      </div>
    </section>
  );
}

