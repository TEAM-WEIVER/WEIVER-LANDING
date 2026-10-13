import { Badge } from '../../ui/badge';
import { PersonAvatar } from '../../PersonAvatar';
import { Card } from '../../ui/card';
import { publicAsset } from '../../../public-asset.js';
import { useEffect, useRef } from 'react';
import RadarChart from '../RadarChart';

export default function Scene4({ onEnter }) {
  const scoreRef = useRef(null);

  useEffect(() => {
    if (onEnter) onEnter(runScore);
  }, [onEnter]); // eslint-disable-line react-hooks/exhaustive-deps

  function runScore() {
    const el = scoreRef.current;
    if (!el) return;
    el.textContent = '0';
    let v = 0;
    setTimeout(() => {
      const tid = setInterval(() => {
        v += 4;
        if (v >= 88) { v = 88; clearInterval(tid); }
        el.textContent = v;
      }, 30);
    }, 500);
  }

  return (
    <>
      <Card presentation className="profile card center">
        <RadarChart />
        <div>
          <div className="who">
            <PersonAvatar className="profile-avatar" />
            <div><b>김위버</b><small>신입 · 서비스 기획</small></div>
            <Badge className="stamp" variant="secondary">AI 면접 완료</Badge>
          </div>
          <div className="scores">
            <div>
              <small>스킬핏 점수</small>
              <strong ref={scoreRef}>0</strong>
            </div>
            <div>
              <small>컬처핏 스타일</small><span>추진형 실행가</span>
            </div>
          </div>
          <div className="tags">
            <span style={{ '--k': 0 }}>논리성 96%</span>
            <span style={{ '--k': 1 }}>성장가능성 92%</span>
            <span style={{ '--k': 2 }}>데이터분석능력</span>
            <span style={{ '--k': 3 }}>User Experience</span>
          </div>
        </div>
      </Card>
      <p className="cap">나의 역량 프로필 완성</p>
    </>
  );
}
