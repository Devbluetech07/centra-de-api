import { useEffect, useRef, useState, type CSSProperties } from "react";
import { gsap } from "gsap";
import "../styles/magic-bento.css";

export interface BentoCardProps {
  color?: string;
  title?: string;
  description?: string;
  label?: string;
}

export interface MagicBentoProps {
  cards: BentoCardProps[];
  spotlightRadius?: number;
  glowColor?: string;
  disableAnimations?: boolean;
}

const MOBILE_BREAKPOINT = 768;

export function MagicBento({
  cards,
  spotlightRadius = 300,
  glowColor = "132, 0, 255",
  disableAnimations = false
}: MagicBentoProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (disableAnimations || isMobile || !gridRef.current) return;

    const cardsEls = Array.from(gridRef.current.querySelectorAll(".magic-bento-card")) as HTMLElement[];
    gsap.fromTo(cardsEls, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.54, stagger: 0.06, ease: "power2.out" });

    const cleanups: Array<() => void> = [];
    cardsEls.forEach((card) => {
      const onMove = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;
        gsap.to(card, { rotateX, rotateY, duration: 0.19, ease: "power2.out", transformPerspective: 1000 });

        const relativeX = ((e.clientX - rect.left) / rect.width) * 100;
        const relativeY = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty("--glow-x", `${relativeX}%`);
        card.style.setProperty("--glow-y", `${relativeY}%`);
        card.style.setProperty("--glow-intensity", "1");
      };

      const onLeave = () => {
        gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.3, ease: "power2.out" });
        card.style.setProperty("--glow-intensity", "0");
      };

      card.addEventListener("mousemove", onMove);
      card.addEventListener("mouseleave", onLeave);
      cleanups.push(() => {
        card.removeEventListener("mousemove", onMove);
        card.removeEventListener("mouseleave", onLeave);
      });
    });

    const spotlight = document.createElement("div");
    spotlight.className = "global-spotlight";
    spotlight.style.cssText = `
      position: fixed;
      width: 640px;
      height: 640px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle, rgba(${glowColor},0.16) 0%, rgba(${glowColor},0.06) 32%, transparent 68%);
      opacity: 0;
      transform: translate(-50%, -50%);
      z-index: 60;
    `;
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    const onMouseMove = (e: MouseEvent) => {
      if (!gridRef.current || !spotlightRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

      gsap.to(spotlightRef.current, {
        left: e.clientX,
        top: e.clientY,
        opacity: inside ? 0.9 : 0,
        duration: inside ? 0.2 : 0.34,
        ease: "power2.out"
      });

      if (inside) {
        cardsEls.forEach((card) => {
          const cardRect = card.getBoundingClientRect();
          const centerX = cardRect.left + cardRect.width / 2;
          const centerY = cardRect.top + cardRect.height / 2;
          const distance = Math.hypot(e.clientX - centerX, e.clientY - centerY);
          const glow = Math.max(0, 1 - distance / spotlightRadius);
          card.style.setProperty("--glow-intensity", glow.toFixed(3));
        });
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    cleanups.push(() => document.removeEventListener("mousemove", onMouseMove));

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      if (spotlightRef.current?.parentNode) {
        spotlightRef.current.parentNode.removeChild(spotlightRef.current);
      }
    };
  }, [cards, disableAnimations, glowColor, isMobile, spotlightRadius]);

  return (
    <div className="card-grid bento-section" ref={gridRef}>
      {cards.map((card, index) => (
        <div
          key={`${card.title ?? "card"}-${index}`}
          className="magic-bento-card magic-bento-card--border-glow"
          style={{ backgroundColor: card.color ?? "#060010", "--glow-color": glowColor } as CSSProperties}
        >
          <div className="magic-bento-card__header">
            <div className="magic-bento-card__label">{card.label}</div>
          </div>
          <div className="magic-bento-card__content">
            <h3 className="magic-bento-card__title">{card.title}</h3>
            <p className="magic-bento-card__description">{card.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
