import {
  ArrowRight,
  Compass,
  HeartHandshake,
  Lightbulb,
  MapPin,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { QUESTION_CATEGORIES } from '../data/questions';
import { CompassLogo } from './CompassLogo';

interface StartScreenProps {
  onStart: () => void;
}

const CATEGORY_ICONS = [
  Sparkles,
  Lightbulb,
  MapPin,
  HeartHandshake,
  Compass,
];

export function StartScreen({ onStart }: StartScreenProps) {
  return (
    <section className="start-screen">
      <div className="hero-card">
        <div className="hero-content">
          <div className="hero-pill">
            <Compass size={15} />
            <span>고등학생을 위한 AI 자기이해·진로탐색</span>
          </div>

          <h1 className="hero-title">
            정답을 정해주지 않는
            <br />
            <span className="hero-highlight">나만의 진로 나침반</span>
          </h1>

          <p className="hero-description">
            <strong>나의 진로 나침반(My Career Compass)</strong>은 이름이나 학교
            정보 없이 나의 흥미, 적성, 선호하는 환경, 직업 가치관, 관심 활동을
            돌아보고 AI의 도움을 받아 앞으로 탐색해볼 방향과 활동을{' '}
            <strong>스스로 결정</strong>할 수 있도록 돕는 교육용 웹앱입니다.
          </p>

          <div className="hero-cta-row">
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={onStart}
            >
              <span>진로탐색 시작하기</span>
              <ArrowRight size={18} />
            </button>
            <span className="hero-meta-note">
              총 15개 문항 · 약 3~5분 소요 · 개인정보 미수집
            </span>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="compass-showcase">
            <div className="compass-ring compass-ring-outer" />
            <div className="compass-ring compass-ring-inner" />
            <CompassLogo size={116} />
            <span className="direction-tag direction-n">흥미</span>
            <span className="direction-tag direction-e">적성</span>
            <span className="direction-tag direction-s">가치관</span>
            <span className="direction-tag direction-w">활동</span>
          </div>
        </div>
      </div>

      <div className="section-block">
        <div className="section-heading">
          <h2>5가지 영역으로 나를 이해해요</h2>
          <p>
            각 영역당 3개씩 총 15개의 질문에 답하며 지금의 나를 정리합니다.
            고민되는 문항은 &ldquo;아직 잘 모르겠어요&rdquo;를 선택해도
            괜찮아요.
          </p>
        </div>

        <div className="category-grid">
          {QUESTION_CATEGORIES.map((category, index) => {
            const Icon = CATEGORY_ICONS[index] ?? Compass;
            return (
              <article key={category.id} className="category-preview-card">
                <div className="category-icon-wrap">
                  <Icon size={20} />
                </div>
                <div className="category-preview-step">영역 {index + 1}</div>
                <h3>{category.label}</h3>
                <p>{category.description}</p>
              </article>
            );
          })}
        </div>
      </div>

      <div className="notice-banner">
        <ShieldCheck size={20} className="notice-icon" />
        <div className="notice-text">
          <strong>안심하고 솔직하게 응답해보세요</strong>
          <p>
            이름, 학교명, 연락처 등 개인정보는 전혀 수집하지 않습니다. 결과
            리포트는 정식 심리·적성검사가 아닌 자기이해를 돕기 위한
            참고자료이며, 특정 직업이나 대학을 단정적으로 추천하지 않습니다.
          </p>
        </div>
      </div>
    </section>
  );
}

