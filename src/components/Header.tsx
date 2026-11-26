import { RotateCcw } from 'lucide-react';
import { CompassLogo } from './CompassLogo';

interface HeaderProps {
  showReset: boolean;
  onReset: () => void;
}

export function Header({ showReset, onReset }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="container header-inner">
        <button
          type="button"
          className="brand-button"
          onClick={onReset}
          aria-label="나의 진로 나침반 처음으로 이동"
        >
          <CompassLogo size={38} />
          <div className="brand-text">
            <span className="brand-title">나의 진로 나침반</span>
            <span className="brand-subtitle">My Career Compass</span>
          </div>
        </button>

        <div className="header-actions">
          <span className="header-badge">고등학생 자기주도 진로탐색</span>
          {showReset && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onReset}
            >
              <RotateCcw size={15} />
              <span>처음으로</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

