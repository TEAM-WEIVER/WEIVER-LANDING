import { Button } from '../ui/button';
import { useEffect, useRef, useState } from 'react';

const DURATIONS = [3000, 2400, 4300, 3900, 4700, 3500, 3500, 2500];
// index 3 = 역량 프로필 씬 (RadarChart 카운트업 트리거)
export const PROFILE_IDX = 3;

export default function ScenePlayer({ scenes, playing, onTogglePause, onSceneEnter, sceneClassNames }) {
  const [activeIdx, setActiveIdx] = useState(null);
  const stateRef = useRef({ idx: 0, timer: null, started: 0, remaining: DURATIONS[0] });
  const reduce = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches).current;
  const playingRef = useRef(playing);
  const isMounted = useRef(false);

  // 씬 DOM에 on/out 클래스를 직접 조작 (CSS transition 의존)
  const sceneRefs = useRef([]);

  function showScene(n) {
    sceneRefs.current.forEach((el) => {
      if (!el) return;
      if (el.classList.contains('on')) {
        el.classList.remove('on');
        el.classList.add('out');
        clearTimeout(el._outTimer);
        el._outTimer = setTimeout(() => el.classList.remove('out'), 500);
      }
    });
    const target = sceneRefs.current[n];
    if (!target) return;
    void document.getElementById('film')?.offsetWidth;
    target.classList.remove('out');
    clearTimeout(target._outTimer);
    target.classList.add('on');
    setActiveIdx(n);
    if (onSceneEnter) onSceneEnter(n);
  }

  function schedule(ms) {
    const s = stateRef.current;
    s.started = Date.now();
    s.remaining = ms;
    clearTimeout(s.timer);
    s.timer = setTimeout(() => {
      if (s.idx + 1 >= DURATIONS.length) return;
      s.idx = s.idx + 1;
      showScene(s.idx);
      schedule(DURATIONS[s.idx]);
    }, ms);
  }

  useEffect(() => {
    if (reduce) {
      showScene(PROFILE_IDX);
      return;
    }
    showScene(0);
    schedule(DURATIONS[0]);
    return () => clearTimeout(stateRef.current.timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // playing prop → ref 동기화 + pause/resume 처리
  useEffect(() => {
    playingRef.current = playing;

    // 마운트 시 첫 실행은 init effect가 담당하므로 스킵
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    const film = document.getElementById('film');
    const animEls = film
      ? film.querySelectorAll('.scene.on, .scene.on *, .scene.out, .scene.out *')
      : [];

    if (playing) {
      animEls.forEach(el => (el.style.animationPlayState = 'running'));
      const s = stateRef.current;
      schedule(Math.max(s.remaining, 300));
    } else {
      animEls.forEach(el => (el.style.animationPlayState = 'paused'));
      const s = stateRef.current;
      clearTimeout(s.timer);
      s.remaining -= Date.now() - s.started;
    }
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {scenes.map((scene, i) => (
        <div
          key={i}
          className={`scene ${sceneClassNames ? sceneClassNames[i] : `s${i + 1}`}`}
          ref={el => (sceneRefs.current[i] = el)}
        >
          {scene}
        </div>
      ))}

      <div className="film-ui">
        <p className="intro">weiver가 달라지는 채용을 준비합니다</p>
        {!reduce && (
          <Button
            variant="ghost"
            size="icon"
            id="pause"
            className="pause"
            aria-pressed={!playing}
            aria-label={playing ? '영상 일시정지' : '영상 재생'}
            onClick={onTogglePause}
          >
            <svg viewBox="0 0 14 14" aria-hidden="true">
              {!playing ? (
                <path d="M3 1.5v11l9-5.5z" />
              ) : (
                <>
                  <rect x="2" y="1" width="3.5" height="12" rx="1" />
                  <rect x="8.5" y="1" width="3.5" height="12" rx="1" />
                </>
              )}
            </svg>
          </Button>
        )}
      </div>

      {!reduce && (
        <div className="cue" aria-hidden="true">
          <i />
        </div>
      )}
    </>
  );
}
