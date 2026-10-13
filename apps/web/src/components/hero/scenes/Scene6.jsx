import { publicAsset } from '../../../public-asset.js';
export default function Scene6() {
  return (
    <div className="center">
      <img className="icon" src={publicAsset("app-icon.png")} alt="" />
      <span className="logo big" role="img" aria-label="weiver" />
      <p>한 번의 준비로, 더 많은 가능성을.</p>
    </div>
  );
}
