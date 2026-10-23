"use client";

import { useEffect } from "react";

// Fades sections in as they scroll into view. Without JS everything is simply
// visible (the hiding class is only added here).
export default function Reveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    root.classList.add("js-reveal");
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
      { rootMargin: "0px 0px -8% 0px" }
    );
    const els = document.querySelectorAll(".reveal");
    els.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("in");
      io.observe(el);
    });
    return () => {
      io.disconnect();
      root.classList.remove("js-reveal");
    };
  }, []);
  return null;
}
