import { useEffect, useRef, useState } from 'react';
import { AnswerReviewScreen } from './components/AnswerReviewScreen';
import { Header } from './components/Header';
import { QuestionnaireScreen } from './components/QuestionnaireScreen';
import { ReportScreen } from './components/ReportScreen';
import { StartScreen } from './components/StartScreen';
import { CAREER_QUESTIONS } from './data/questions';
import { CareerApiError, requestCareerReport } from './services/careerApi';
import type { AnswerMap, CareerReport } from './types/career';

type AppStep = 'start' | 'questions' | 'review' | 'report';

export function App() {
  const [step, setStep] = useState<AppStep>('start');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [isEditingFromReview, setIsEditingFromReview] = useState(false);

  const [report, setReport] = useState<CareerReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const inFlightRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, currentQuestionIndex]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  function handleStart() {
    setStep('questions');
    setCurrentQuestionIndex(0);
    setIsEditingFromReview(false);
  }

  function handleSelectAnswer(questionId: string, selectedOptionIds: string[]) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: selectedOptionIds,
    }));
    // Clear previous report if answers changed so it reflects latest answers
    if (report) {
      setReport(null);
    }
  }

  function handleEditFromReview(questionIndex: number) {
    setCurrentQuestionIndex(questionIndex);
    setIsEditingFromReview(true);
    setStep('questions');
  }

  function handleGoReview() {
    setIsEditingFromReview(false);
    setStep('review');
  }

  async function handleGenerateReport() {
    if (inFlightRef.current) return;

    const allAnswered = CAREER_QUESTIONS.every(
      (q) => (answers[q.id]?.length ?? 0) > 0
    );
    if (!allAnswered) {
      const firstUnanswered = CAREER_QUESTIONS.findIndex(
        (q) => (answers[q.id]?.length ?? 0) === 0
      );
      setCurrentQuestionIndex(Math.max(0, firstUnanswered));
      setStep('questions');
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    inFlightRef.current = true;
    setIsLoadingReport(true);
    setReportError(null);
    setReport(null);
    setStep('report');

    try {
      const data = await requestCareerReport(answers, controller.signal);
      setReport(data.report);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      if (err instanceof CareerApiError) {
        setReportError(err.message);
      } else {
        setReportError(
          'AI 진로탐색 리포트를 불러오는 중 예상치 못한 오류가 발생했습니다. 다시 시도해주세요.'
        );
      }
    } finally {
      inFlightRef.current = false;
      setIsLoadingReport(false);
    }
  }

  function handleRestart() {
    abortControllerRef.current?.abort();
    inFlightRef.current = false;
    setAnswers({});
    setCurrentQuestionIndex(0);
    setIsEditingFromReview(false);
    setReport(null);
    setReportError(null);
    setIsLoadingReport(false);
    setStep('start');
  }

  return (
    <div className="app-shell">
      <Header showReset={step !== 'start'} onReset={handleRestart} />

      <main className="app-main container">
        {step === 'start' && <StartScreen onStart={handleStart} />}

        {step === 'questions' && (
          <QuestionnaireScreen
            currentIndex={currentQuestionIndex}
            answers={answers}
            isEditingFromReview={isEditingFromReview}
            onSelectAnswer={handleSelectAnswer}
            onChangeIndex={setCurrentQuestionIndex}
            onGoReview={handleGoReview}
            onBackToStart={() => setStep('start')}
          />
        )}

        {step === 'review' && (
          <AnswerReviewScreen
            answers={answers}
            onEditQuestion={handleEditFromReview}
            onBackToLastQuestion={() => {
              setIsEditingFromReview(false);
              setCurrentQuestionIndex(CAREER_QUESTIONS.length - 1);
              setStep('questions');
            }}
            onSubmit={handleGenerateReport}
            isSubmitting={isLoadingReport}
          />
        )}

        {step === 'report' && (
          <ReportScreen
            isLoading={isLoadingReport}
            error={reportError}
            report={report}
            answers={answers}
            onRetry={handleGenerateReport}
            onBackToReview={() => setStep('review')}
            onRestart={handleRestart}
          />
        )}
      </main>

      <footer className="app-footer">
        <div className="container footer-inner">
          <p>
            <strong>나의 진로 나침반 (My Career Compass)</strong> · 고등학생
            자기주도 진로탐색 웹앱
          </p>
          <p className="footer-sub">
            개인정보를 수집하지 않으며, 본 리포트는 자기이해를 돕기 위한
            참고자료입니다.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
