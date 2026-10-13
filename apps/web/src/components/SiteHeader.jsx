import { Button } from './ui/button';
import { useEffect, useRef } from "react";

export default function SiteHeader() {
  const headRef = useRef(null);
  useEffect(() => {
    function update() {
      const section = document.getElementById('reserve');
      if (!section || !headRef.current) return;
      const rect = section.getBoundingClientRect();
      const height = headRef.current.offsetHeight;
      headRef.current.classList.toggle('on-light', rect.top <= height + 16 && rect.bottom > height);
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, []);

  return (
    <header className="site-head" id="head" ref={headRef}>
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
