import { Button } from './ui/button';
import { useEffect, useRef } from "react";

export default function SiteHeader() {
  // 스크롤 위치에 따른 header 색 변화(보류)
  // const headRef = useRef(null);

  // useEffect(() => {
  //   function onScroll() {
  //     const stage = document.getElementById('stage');
  //     if (!stage || !headRef.current) return;
  //     headRef.current.classList.toggle('solid', stage.getBoundingClientRect().bottom <= 0);
  //   }
  //   window.addEventListener('scroll', onScroll, { passive: true });
  //   return () => window.removeEventListener('scroll', onScroll);
  // }, []);

  return (
    <header className="site-head" id="head">
      {/* <header className="site-head" useRef={headRef} id="head"> */}
      <a className="wordmark" href="#top" aria-label="weiver 홈">
        <span className="logo" role="img" aria-label="weiver" />
      </a>
      <Button asChild size="sm"><a
        className="btn btn-sm"
        href="#reserve"
        onClick={(e) => { e.preventDefault(); document.querySelector('section.demo')?.scrollIntoView({ behavior: 'smooth' }); }}
      >
        사전예약
      </a></Button>
    </header>
  );
}
