import { CompassLogo } from './CompassLogo';

export function LoadingReportView() {
  return (
    <section className="loading-screen" aria-live="polite">
      <div className="loading-card">
        <div className="loading-compass-wrap">
          <div className="loading-pulse-ring" />
          <CompassLogo size={88} spinning />
        </div>

        <h2>나의 진로 나침반을 맞추고 있어요</h2>
        <p className="loading-description">
          15개의 자기이해 응답을 바탕으로 관심 특성, 탐색해볼 만한 분야,
          스스로에게 던져볼 질문과 진로탐색 활동을 정리하고 있습니다.
        </p>

        <div className="loading-steps-hint">
          <span>흥미·적성 흐름 파악</span>
          <span className="dot-sep" aria-hidden="true">
            ·
          </span>
          <span>환경·가치관 연결</span>
          <span className="dot-sep" aria-hidden="true">
            ·
          </span>
          <span>맞춤 탐색 활동 구성</span>
        </div>

        <p className="loading-subnote">
          보통 몇 초 정도 걸립니다. 잠시만 기다려주세요.
        </p>
      </div>
    </section>
  );
}

