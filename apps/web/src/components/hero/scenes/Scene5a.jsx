import { publicAsset } from '../../../public-asset.js';
export default function Scene5a() {
  return (
    <>
      <div className="frame center">
        <div className="bar">
          <img src={publicAsset("favicon.png")} alt="" />weiver 기업용 지원자 리포트
        </div>
        <div className="shot">
          <img src={publicAsset("report.jpg")} alt="기업이 보는 지원자 상세 리포트 화면" />
          <span className="hit" />
          <svg className="cursor" viewBox="0 0 24 24">
            <path d="M4 2l16 10-7 1.6L9.6 21z" fill="#fff" stroke="#0F172A" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      <div className="sent">컨택 제안을 보냈어요</div>
      <p className="cap">기업이 내 역량을 먼저 확인하고</p>
    </>
  );
}
