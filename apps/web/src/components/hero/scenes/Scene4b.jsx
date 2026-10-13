import { publicAsset } from '../../../public-asset.js';
import DashboardFrame from '../DashboardFrame';

export default function Scene4b() {
  return (
    <>
      <div className="frame center">
        <div className="bar">
          <img src={publicAsset("favicon.png")} alt="" />weiver 개인 대시보드
        </div>
        <DashboardFrame />
      </div>
      <div className="matching"><i />기업 매칭을 시작했어요</div>
      <p className="cap">서류부터 매칭까지, 진행 상황을 한눈에</p>
    </>
  );
}
