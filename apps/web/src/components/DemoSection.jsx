import { useRef, useState } from 'react';
import { rememberSurveyReservation, reserve, track } from '../api';
import { APPLICANT_TYPES, JOB_FAMILIES, PRIMARY_ROLES } from '../survey-options';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { NativeSelect } from './ui/native-select';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Alert, AlertDescription } from './ui/alert';
import { Field, FieldLabel, FieldLegend, FieldSet, FieldDescription, FieldError } from './ui/field';
import { Spinner } from './ui/spinner';

const OPTIONS = [
  { id: 'QUICK_AI_INTERVIEW', badge: '부담 없이 시작', badgeClass: '', title: '간편 AI 면접 체험', sub: '이력서 + 간단 설문', desc: '자기소개서와 포트폴리오 없이 AI 면접을 연습해 보세요.' },
  { id: 'REVERSE_MATCHING', badge: '전체 과정 경험', badgeClass: 'full', title: '역매칭 준비 체험', sub: '이력서 + 자기소개서 + 포트폴리오', desc: '역량 프로필을 완성하고 정식 출시 후 기업 컨택까지 준비해요.' },
];

export default function DemoSection() {
  const [selected, setSelected] = useState(OPTIONS[0].id);
  const [jobFamily, setJobFamily] = useState('');
  const [applicantType, setApplicantType] = useState('');
  const [primaryRole, setPrimaryRole] = useState('');
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const reservationRef = useRef(null);
  const [status, setStatus] = useState('idle');

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    if (status === 'loading' || !form.reportValidity()) return;
    if (!consent) { setConsentError(true); return; }
    const fields = new FormData(form);
    const name = fields.get('name').trim();
    const email = fields.get('email').trim();
    const reservationType = selected;
    setStatus('loading');
    track('reserve_opened', { reservationType });
    try {
      const reservation = await reserve({ name, email, reservationType, privacyConsent: consent, jobFamily, applicantType, primaryRole });
      reservationRef.current = reservation;
      rememberSurveyReservation(reservation);
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
        <div><h2 id="demo-title">나에게 맞는 방식으로 <span className="logo" role="img" aria-label="weiver" style={{ display: 'inline-block', height: '0.85em', verticalAlign: 'middle', color: 'currentColor' }} />를 먼저 경험해 보세요.</h2></div>
        <p>두 가지 방식 중 하나를 선택해 AI 면접과 역량 검증 과정을 먼저 경험할 수 있어요.</p>
      </div>
      <RadioGroup className="demo-options" aria-label="데모 참여 방식" value={selected} onValueChange={setSelected} disabled={status === 'loading'}>
        {OPTIONS.map((opt) => (
          <Card key={opt.id} asChild presentation>
            <RadioGroupItem value={opt.id} className="demo-option" data-option={opt.id}>
              <Badge className={`badge${opt.badgeClass ? ` ${opt.badgeClass}` : ''}`}>{opt.badge}</Badge>
              <strong>{opt.title}</strong><small>{opt.sub}</small><em>{opt.desc}</em>
            </RadioGroupItem>
          </Card>
        ))}
      </RadioGroup>
      <Card presentation className="reservation">
        <div className="reservation-copy"><p>선택한 체험</p><output>{selectedOption?.title}</output></div>
        {status === 'success' ? (
          <Alert className="reservation-message show" role="status">
            <AlertDescription><p>사전예약이 완료됐습니다. 출시 시 연락드리겠습니다.</p>
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} aria-busy={status === 'loading'} onInvalidCapture={(e) => {
            if (e.target.name === 'privacyConsent') {
              e.preventDefault(); setConsentError(true); document.getElementById('privacy-consent')?.focus();
            }
          }}>
            <FieldSet className="reservation-survey" disabled={status === 'loading'}>
              <FieldLegend>지원 분야를 알려주세요</FieldLegend>
              <Field>
                <FieldLabel htmlFor="job-family">직군 <small>(필수)</small></FieldLabel>
                <NativeSelect id="job-family" name="jobFamily" required value={jobFamily} onChange={(e) => { setJobFamily(e.target.value); setPrimaryRole(''); }}>
                  <option value="">직군 선택</option>
                  {JOB_FAMILIES.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="applicant-type">현재 지원 유형 <small>(필수)</small></FieldLabel>
                <NativeSelect id="applicant-type" name="applicantType" required value={applicantType} onChange={(e) => setApplicantType(e.target.value)}>
                  <option value="">지원 유형 선택</option>
                  {APPLICANT_TYPES.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="primary-role">주 관심 직무 <small>(필수)</small></FieldLabel>
                <NativeSelect id="primary-role" name="primaryRole" required disabled={!jobFamily} value={primaryRole} onChange={(e) => setPrimaryRole(e.target.value)}>
                  <option value="">{jobFamily ? '주 관심 직무 선택' : '직군을 먼저 선택해주세요'}</option>
                  {(PRIMARY_ROLES[jobFamily] ?? []).map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
                </NativeSelect>
              </Field>
            </FieldSet>
            <Field><FieldLabel htmlFor="reservation-name">이름 <small>(필수)</small></FieldLabel>
              <Input id="reservation-name" name="name" type="text" autoComplete="name" placeholder="이름" maxLength={100} disabled={status === 'loading'} required aria-label="이름" />
            </Field>
            <Field><FieldLabel htmlFor="reservation-email">이메일 <small>(필수)</small></FieldLabel>
              <Input id="reservation-email" name="email" type="email" autoComplete="email" placeholder="이메일" disabled={status === 'loading'} required aria-label="이메일" />
            </Field>
            <Field orientation="horizontal" className="reservation-consent" data-invalid={consentError || undefined}>
              <Checkbox id="privacy-consent" name="privacyConsent" checked={consent} onCheckedChange={(checked) => { setConsent(checked === true); setConsentError(false); }} disabled={status === 'loading'} required aria-invalid={consentError || undefined} aria-describedby={consentError ? 'consent-error' : undefined} />
              <FieldLabel htmlFor="privacy-consent">개인정보 수집·이용에 동의합니다. (필수)</FieldLabel>
            </Field>
            {consentError && <FieldError id="consent-error" className="consent-error">개인정보 수집·이용에 동의해주세요.</FieldError>}
            <Button type="submit" disabled={status === 'loading'} className="reservation-submit">
              {status === 'loading' && <Spinner aria-hidden="true" />}
              {status === 'loading' ? '제출 중...' : '사전예약하기'}
            </Button>
          </form>
        )}
        {status === 'duplicate' && <Alert variant="destructive" className="reservation-message show"><AlertDescription>이미 사전예약된 이메일입니다.</AlertDescription></Alert>}
        {status === 'error' && <Alert variant="destructive" className="reservation-message show"><AlertDescription>오류가 발생했습니다. 잠시 후 다시 시도해 주세요.</AlertDescription></Alert>}
        <FieldDescription className="reservation-note">개인정보는 weiver 서비스 출시 안내 목적으로만 사용됩니다.</FieldDescription>
      </Card>
    </section>
  );
}
