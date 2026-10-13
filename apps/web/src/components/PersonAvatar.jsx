import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { publicAsset } from '../public-asset';

export function PersonAvatar({ className }) {
  return <Avatar className={className} aria-hidden="true">
    <AvatarImage src={publicAsset('avatar.jpg')} alt="" />
    <AvatarFallback>위버</AvatarFallback>
  </Avatar>;
}
