import { useState } from 'react';
import { reserve, track } from '../api';

const OPTIONS = [
  {
    id: 'QUICK_AI_INTERVIEW',
    badge: '부담 없이 시작',
    badgeClass: '',
    title: '간편 AI 면접 체험',
    sub: '이력서 + 간단 설문',
    desc: '자기소개서와 포트폴리오 없이 AI 면접을 연습해 보세요.',
  },
  {
    id: 'REVERSE_MATCHING',
    badge: '전체 과정 경험',
    badgeClass: 'full',
    title: '역매칭 준비 체험',
    sub: '이력서 + 자기소개서 + 포트폴리오',
    desc: '역량 프로필을 완성하고 정식 출시 후 기업 컨택까지 준비해요.',
  },
];

export default function DemoSection() {
  const [selected, setSelected] = useState(OPTIONS[0].id);
  const [status, setStatus] = useState('idle'); // idle | loading | success | duplicate | error

  async function handleSubmit(e) {
    e.preventDefault();
    if (!e.target.reportValidity()) return;

    const name = e.target.name.value.trim();
    const email = e.target.email.value.trim();
    const privacyConsent = e.target.privacyConsent.checked;

    setStatus('loading');
    track('reserve_opened', { reservationType: selected });

    try {
      await reserve({ name, email, reservationType: selected, privacyConsent });
      track('reservation_completed', { reservationType: selected });
      setStatus('success');
    } catch (err) {
      setStatus(err.message === 'DUPLICATE_EMAIL' ? 'duplicate' : 'error');
    }
  }

  const selectedOption = OPTIONS.find((o) => o.id === selected);

  return (
    <section className="demo" id="reserve" aria-labelledby="demo-title" data-section-id="reserve">
      <div className="demo-head">
        <div>
          <h2 id="demo-title">나에게 맞는 방식으로 <span className="logo" role="img" aria-label="weiver" style={{ display: 'inline-block', height: '0.85em', verticalAlign: 'middle', color: 'currentColor' }} />를 먼저 경험해 보세요.</h2>
        </div>
        <p>두 가지 방식 중 하나를 선택해 AI 면접과 역량 검증 과정을 먼저 경험할 수 있어요.</p>
      </div>
      <div className="demo-options" role="radiogroup" aria-label="데모 참여 방식">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            className="demo-option"
            type="button"
            role="radio"
            aria-checked={selected === opt.id}
            data-option={opt.id}
            onClick={() => setSelected(opt.id)}
          >
            <span className={`badge${opt.badgeClass ? ` ${opt.badgeClass}` : ''}`}>{opt.badge}</span>
            <strong>{opt.title}</strong>
            <small>{opt.sub}</small>
            <em>{opt.desc}</em>
          </button>
        ))}
      </div>
      <div className="reservation">
        <div className="reservation-copy">
          <p>선택한 체험</p>
          <output>{selectedOption?.title}</output>
        </div>
        {status === 'success' ? (
          <p className="reservation-message show" role="status">
            사전예약이 완료됐습니다. 출시 시 연락드리겠습니다.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <input name="name" type="text" autoComplete="name" placeholder="이름" required aria-label="이름" />
            <input name="email" type="email" autoComplete="email" placeholder="이메일" required aria-label="이메일" />
            <label className="reservation-consent">
              <input name="privacyConsent" type="checkbox" required />
              <span>개인정보 수집·이용에 동의합니다. (필수)</span>
            </label>
            <button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? '제출 중...' : '사전예약하기'}
            </button>
          </form>
        )}
        {status === 'duplicate' && (
          <p className="reservation-message show" role="alert">
            이미 사전예약된 이메일입니다.
          </p>
        )}
        {status === 'error' && (
          <p className="reservation-message show" role="alert">
            오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        )}
        <p className="reservation-note">
          개인정보는 weiver 서비스 출시 안내 목적으로만 사용됩니다.
        </p>
      </div>
    </section>
  );
}
