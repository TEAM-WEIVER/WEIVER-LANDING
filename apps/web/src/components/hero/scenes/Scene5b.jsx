import { publicAsset } from '../../../public-asset.js';
export default function Scene5b() {
  return (
    <>
      <div className="mini card center">
        <img src={publicAsset("avatar.jpg")} alt="" />
        <div><b>김위버</b><small>역량 프로필</small></div>
      </div>
      <div className="note n1" style={{ '--x': '-240px', '--y': '-110px', '--d': '0.2s' }}>
        <span className="co">A</span>
        <span><b>기업 A</b>에서 면접을 제안했어요</span>
      </div>
      <div className="note n2" style={{ '--x': '250px', '--y': '-40px', '--d': '0.8s' }}>
        <span className="co">B</span>
        <span><b>기업 B</b>에서 관심을 보냈어요</span>
      </div>
      <div className="note n3" style={{ '--x': '-210px', '--y': '100px', '--d': '1.4s' }}>
        <span className="co">C</span>
        <span><b>기업 C</b>에서 프로필을 확인했어요</span>
      </div>
      <p className="cap">이제 기업이 먼저 찾아옵니다</p>
    </>
  );
}
