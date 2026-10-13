const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// sessionStorage 단위 탭 ID
function getSessionId() {
  let id = sessionStorage.getItem('session_id');
  if (!id) {
    id = uuid();
    sessionStorage.setItem('session_id', id);
  }
  return id;
}

function getUtm() {
  const p = new URLSearchParams(location.search);
  return {
    source: p.get('utm_source'),
    medium: p.get('utm_medium'),
    campaign: p.get('utm_campaign'),
    content: p.get('utm_content'),
    term: p.get('utm_term'),
  };
}

// F1 — 방문자 부트스트랩
export async function bootstrap() {
  try {
    const res = await fetch(`${BASE}/api/v1/visitors/bootstrap`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: getSessionId(),
        path: location.pathname,
        referrer: document.referrer || null,
        utm: getUtm(),
      }),
    });
    if (!res.ok) return null;
    const { visitorId } = await res.json();
    sessionStorage.setItem('visitor_id', visitorId);
    return visitorId;
  } catch {
    return null;
  }
}

// F2 — 이벤트 트래킹 (fire-and-forget)
export function track(eventName, properties = {}) {
  try {
    const visitorId = sessionStorage.getItem('visitor_id');
    if (!visitorId) return;

    fetch(`${BASE}/api/v1/events`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId,
        sessionId: getSessionId(),
        eventName,
        path: location.pathname,
        properties,
      }),
    }).catch(() => {});
  } catch {
    // Storage/network failures must never turn a saved reservation into an error.
  }
}

/** Returns false when this browser cannot retain stage-2 continuation credentials. */
export function rememberSurveyReservation(reservation) {
  if (!reservation?.id || !reservation.surveyAccessToken) return false;
  try {
    localStorage.setItem(`weiver.survey.v1.${reservation.id}`, JSON.stringify({
      reservationId: reservation.id,
      surveyAccessToken: reservation.surveyAccessToken,
    }));
    return true;
  } catch {
    return false;
  }
}

// F3 — 사전예약
export async function reserve({ name, email, reservationType, privacyConsent, jobFamily, applicantType, primaryRole }) {
  const visitorId = sessionStorage.getItem('visitor_id');
  const res = await fetch(`${BASE}/api/v1/reservations`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitorId,
      sessionId: getSessionId(),
      name,
      email,
      reservationType,
      privacyConsent,
      jobFamily,
      applicantType,
      primaryRole,
      utm: getUtm(),
    }),
  });

  if (res.status === 409) throw new Error('DUPLICATE_EMAIL');
  if (!res.ok) throw new Error('RESERVE_FAILED');
  return res.json();
}
