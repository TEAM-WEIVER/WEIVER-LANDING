import { Card } from '../../ui/card';
export default function Scene2() {
  return (
    <>
      <div className="win" style={{ '--x': '-120px', '--y': '-70px', '--r': '-4deg', '--d': '0s' }}>
        <b>기업 A 자기소개서</b><span /><span /><span />
      </div>
      <div className="win" style={{ '--x': '110px', '--y': '-40px', '--r': '3deg', '--d': '0.08s' }}>
        <b>기업 B 인적성검사</b><span /><span /><span />
      </div>
      <div className="win" style={{ '--x': '-80px', '--y': '30px', '--r': '2deg', '--d': '0.16s' }}>
        <b>기업 C 포트폴리오 제출</b><span /><span /><span />
      </div>
      <div className="win" style={{ '--x': '130px', '--y': '60px', '--r': '-3deg', '--d': '0.24s' }}>
        <b>기업 D 1차 면접</b><span /><span /><span />
      </div>
      <div className="win" style={{ '--x': '0px', '--y': '0px', '--r': '0deg', '--d': '0.32s' }}>
        <b>기업 E 자기소개서</b><span /><span /><span />
      </div>
      <Card presentation className="onedoc card center">
        <b>나의 지원 서류</b>
        <ul>
          <li>이력서</li>
          <li>자기소개서</li>
          <li>포트폴리오</li>
        </ul>
      </Card>
      <p className="cap">이제, 한 번이면 충분해요</p>
    </>
  );
}
