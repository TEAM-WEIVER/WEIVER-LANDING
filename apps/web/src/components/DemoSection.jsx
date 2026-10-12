import { useRef, useState } from 'react';
import { rememberSurveyReservation, reserve, track } from '../api';
import { APPLICANT_TYPES, JOB_FAMILIES, PRIMARY_ROLES } from '../survey-options';

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
  const [jobFamily, setJobFamily] = useState('');
  const [applicantType, setApplicantType] = useState('');
  const [primaryRole, setPrimaryRole] = useState('');
  const [continuationSaved, setContinuationSaved] = useState(true);
  const reservationRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | loading | success | duplicate | error

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    if (status === 'loading' || !form.reportValidity()) return;

    const fields = new FormData(form);
    const name = fields.get('name').trim();
    const email = fields.get('email').trim();
    const privacyConsent = fields.get('privacyConsent') === 'on';

    const reservationType = selected;
    setStatus('loading');
    track('reserve_opened', { reservationType });

    try {
      const reservation = await reserve({ name, email, reservationType, privacyConsent, jobFamily, applicantType, primaryRole });
      reservationRef.current = reservation;
      setContinuationSaved(rememberSurveyReservation(reservation));
      track('reservation_completed', { reservationType });
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
            disabled={status === 'loading'}
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
          <div className="reservation-message show" role="status">
            <p>사전예약이 완료됐습니다. 출시 시 연락드리겠습니다.</p>
            {!continuationSaved && (
              <p>예약은 정상 접수됐습니다. 이 브라우저에서는 나중에 상세 설문을 이어서 작성할 수 없습니다.</p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <fieldset className="reservation-survey" disabled={status === 'loading'}>
              <legend>지원 분야를 알려주세요</legend>
              <label>
                <span>직군 <small>(필수)</small></span>
                <select name="jobFamily" required value={jobFamily} onChange={(e) => {
                  setJobFamily(e.target.value);
                  setPrimaryRole('');
                }}>
                  <option value="">직군 선택</option>
                  {JOB_FAMILIES.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
                </select>
              </label>
              <label>
                <span>현재 지원 유형 <small>(필수)</small></span>
                <select name="applicantType" required value={applicantType} onChange={(e) => setApplicantType(e.target.value)}>
                  <option value="">지원 유형 선택</option>
                  {APPLICANT_TYPES.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
                </select>
              </label>
              <label>
                <span>주 관심 직무 <small>(필수)</small></span>
                <select name="primaryRole" required disabled={!jobFamily} value={primaryRole} onChange={(e) => setPrimaryRole(e.target.value)}>
                  <option value="">{jobFamily ? '주 관심 직무 선택' : '직군을 먼저 선택해주세요'}</option>
                  {(PRIMARY_ROLES[jobFamily] ?? []).map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
                </select>
              </label>
            </fieldset>
            <input name="name" type="text" autoComplete="name" placeholder="이름" maxLength={100} disabled={status === 'loading'} required aria-label="이름" />
            <input name="email" type="email" autoComplete="email" placeholder="이메일" disabled={status === 'loading'} required aria-label="이메일" />
            <label className="reservation-consent">
              <input name="privacyConsent" type="checkbox" disabled={status === 'loading'} required />
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
