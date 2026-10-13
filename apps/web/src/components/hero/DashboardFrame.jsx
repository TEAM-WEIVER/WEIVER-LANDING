import { PersonAvatar } from '../PersonAvatar';
import { Card } from '../ui/card';
import { publicAsset } from '../../public-asset.js';
import { useEffect, useRef } from 'react';

export default function DashboardFrame() {
  const shotRef = useRef(null);
  const camRef = useRef(null);
  const dashRef = useRef(null);
  const matchRef = useRef(null);

  useEffect(() => {
    function fit() {
      const shot = shotRef.current;
      const cam = camRef.current;
      const dash = dashRef.current;
      const match = matchRef.current;
      if (!shot || !cam || !dash || !match) return;
      const w = shot.clientWidth;
      if (!w) return;
      const m = w < 520;
      dash.classList.toggle('m', m);
      const k = w / (m ? 420 : 1316);
      dash.style.transform = `scale(${k})`;
      shot.style.height = Math.ceil(dash.offsetHeight * k) + 'px';
      let x = match.offsetWidth / 2;
      let y = match.offsetHeight / 2;
      let el = match;
      while (el && el !== dash) {
        x += el.offsetLeft;
        y += el.offsetTop;
        el = el.offsetParent;
      }
      if (m) x -= match.offsetWidth / 2 - 24;
      cam.style.setProperty('--z', m ? 1.3 : 1.75);
      cam.style.transformOrigin = `${(x * k).toFixed(1)}px ${(y * k).toFixed(1)}px`;
    }
    fit();
    window.addEventListener('resize', fit);
    if (document.fonts?.ready) document.fonts.ready.then(fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  return (
    <div className="shot dash-shot" ref={shotRef}>
      <div className="cam" ref={camRef}>
        <div
          className="dash"
          ref={dashRef}
          role="img"
          aria-label="개인 대시보드: 이력서, 자기소개서, 포트폴리오 작성 완료. AI 서류분석과 AI 면접 완료, 기업 매칭 진행 중"
        >
          <div className="d-side" aria-hidden="true">
            <img src={publicAsset("app-icon.png")} alt="" />
            <span className="d-nav">
              <svg viewBox="0 0 24 24">
                <path d="M3 5a2 2 0 012-2h6v8H3zM13 3h6a2 2 0 012 2v4h-8zM13 11h8v8a2 2 0 01-2 2h-6zM3 13h8v8H5a2 2 0 01-2-2z" fill="#fff" />
              </svg>
            </span>
            <span className="grow" />
            <svg viewBox="0 0 24 24">
              <path d="M12 2a10 10 0 110 20 10 10 0 010-20zm0 14.2a1.3 1.3 0 100 2.6 1.3 1.3 0 000-2.6zM12 6a3.6 3.6 0 00-3.6 3.4h2.2A1.4 1.4 0 0112 8.2c.8 0 1.4.6 1.4 1.3 0 .6-.3.9-1 1.4-1 .6-1.6 1.3-1.6 2.6v.4h2.1v-.3c0-.6.3-.9 1-1.4 1-.6 1.7-1.3 1.7-2.8C15.6 7.4 14.1 6 12 6z" />
            </svg>
            <svg viewBox="0 0 24 24">
              <path d="M13.7 2l.5 2.6 1.6.9 2.5-.9 1.7 2.9-2 1.7v1.8l2 1.7-1.7 2.9-2.5-.9-1.6.9-.5 2.6h-3.4l-.5-2.6-1.6-.9-2.5.9-1.7-2.9 2-1.7V9.2l-2-1.7L5.7 4.6l2.5.9 1.6-.9.5-2.6zM12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" />
            </svg>
            <span className="d-me" />
          </div>
          <div className="d-main">
            <Card presentation className="d-card d-prof">
              <PersonAvatar className="d-ava" />
              <div className="d-id">
                <b>김위버님</b>
                <span>
                  <svg viewBox="0 0 16 16"><path d="M1 3h14v10H1zm1.5 1.4v.3L8 8.6l5.5-3.9v-.3z" /></svg>
                  kimweiver@gmail.com
                </span>
                <span>
                  <svg viewBox="0 0 16 16"><path d="M4.2 1.5l2 2.6-1.1 1.6a8 8 0 005.2 5.2l1.6-1.1 2.6 2-1 2.2C7 14 2 9 1.9 2.5z" /></svg>
                  010-0000-0000
                </span>
              </div>
              <div className="d-comp">
                <h4>프로필 완성도</h4>
                <div className="d-chips">
                  <div className="chip" style={{ '--d': '0.45s' }}>
                    <span>이력서</span>
                    <span className="sw"><span>작성중</span><span>작성완료</span></span>
                    <span className="ico" aria-hidden="true"><i /></span>
                  </div>
                  <div className="chip" style={{ '--d': '0.6s' }}>
                    <span>자기소개서</span>
                    <span className="sw"><span>작성중</span><span>작성완료</span></span>
                    <span className="ico" aria-hidden="true"><i /></span>
                  </div>
                  <div className="chip" style={{ '--d': '0.75s' }}>
                    <span>포트폴리오</span>
                    <span className="sw"><span>작성중</span><span>작성완료</span></span>
                    <span className="ico" aria-hidden="true"><i /></span>
                  </div>
                </div>
              </div>
              <div className="d-acts">
                <span className="d-btn">프로필 수정</span>
                <span className="d-btn off">제출 완료</span>
              </div>
            </Card>
            <div className="d-row">
              <Card presentation className="d-card d-proc">
                <h4>AI 채용 프로세스</h4>
                <div className="d-steps">
                  <div className="step" style={{ '--d': '1.05s' }}>
                    <span className="ico" aria-hidden="true"><i /></span>
                    <div>
                      <b>AI 서류분석</b>
                      <span className="sw"><span>대기</span><span>분석 완료</span></span>
                    </div>
                  </div>
                  <div className="step" style={{ '--d': '1.55s' }}>
                    <span className="ico" aria-hidden="true"><i /></span>
                    <div>
                      <b>AI 면접</b>
                      <span className="sw"><span>대기</span><span>진행 완료</span></span>
                    </div>
                  </div>
                  <div className="step match" ref={matchRef} style={{ '--d': '2.1s' }}>
                    <span className="ico run" aria-hidden="true">
                      <i>
                        <u style={{ '--k': 0 }} /><u style={{ '--k': 1 }} /><u style={{ '--k': 2 }} />
                      </i>
                    </span>
                    <div>
                      <b>기업 매칭</b>
                      <span className="sw run"><span>대기</span><span>진행중</span></span>
                    </div>
                  </div>
                </div>
              </Card>
              <div className="d-cta">
                <b>AI 면접을 진행할 준비가 되셨나요?</b>
                <p>면접은 1차 기술면접, 2차 인적성면접으로 진행되며 약 1시간 정도 소요됩니다.</p>
                <span className="d-go sw" style={{ '--d': '1.55s' }}>
                  <span>AI 면접 시작하기</span><span>AI 면접 진행 완료</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
