import { Card } from '../../ui/card';
import { publicAsset } from '../../../public-asset.js';
export default function Scene3() {
  return (
    <>
      <div className="frame center">
        <div className="bar">
          <img src={publicAsset("favicon.png")} alt="" />weiver AI 면접
        </div>
        <div className="shot">
          <img src={publicAsset("interview.jpg")} alt="weiver AI 면접 진행 화면" />
        </div>
      </div>
      <Card presentation className="uploaded card">
        <b>서류 등록 완료</b>
        <div><span>이력서</span><em>완료</em></div>
        <div><span>자기소개서</span><em>완료</em></div>
        <div><span>포트폴리오</span><em>완료</em></div>
      </Card>
      <div className="analyzing"><i />음성과 표정을 분석하고 있어요</div>
      <p className="cap">서류 등록과 AI 면접, 한 번으로</p>
    </>
  );
}
