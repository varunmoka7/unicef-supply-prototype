import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import type { Buyer } from "../lib/buyer";
import { CHAPTERS, DIRECTORY } from "./homeData";
import "./Index.css";

gsap.registerPlugin(ScrollTrigger);

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

const TIER_ORDER: [string, string][] = [
  ["reported", "Reported"],
  ["claim_extracted", "Claim"],
  ["gap", "Gap"],
];

// Landing page. One driver: scroll progress through the pinned stage maps to zoom, highlight draw, caption and citation.
export default function Index({ buyer }: { buyer: Buyer }): JSX.Element {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // static layout is already complete

    el.classList.add("is-live");
    const lenis = new Lenis({ lerp: 0.12 });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      // hero: marker draws under "own reports", pages settle in
      gsap.from(".hx-bar", { scaleX: 0, duration: 1.1, ease: "power3.inOut", delay: 0.35 });
      gsap.from(".hx-line > span", { yPercent: 105, duration: 0.9, ease: "power3.out", stagger: 0.08 });
      gsap.from(".hx-page", { y: 80, opacity: 0, duration: 1.1, ease: "power3.out", stagger: 0.12, delay: 0.25 });

      // tiers: each bar draws as it arrives
      gsap.utils.toArray<HTMLElement>(".tier-bar").forEach((b) => {
        gsap.from(b, { scaleX: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: b, start: "top 88%" } });
      });

      // pinned pull-back
      const view = el.querySelector<HTMLElement>(".pb-view")!;
      const stage = el.querySelector<HTMLElement>(".pb-stage")!;
      const pages = gsap.utils.toArray<HTMLElement>(".pb-page");
      const drifts = gsap.utils.toArray<HTMLElement>(".pb-drift");
      const notes = gsap.utils.toArray<HTMLElement>(".pb-note");
      const cites = gsap.utils.toArray<HTMLElement>(".pb-cite");
      const bars = pages.map((p) => gsap.utils.toArray<HTMLElement>(".pb-hl", p));
      const count = el.querySelector<HTMLElement>(".pb-count")!;
      const n = CHAPTERS.length;
      let vw = 0, vh = 0, fit: { w: number; h: number; s0: number }[] = [];

      const measure = () => {
        const r = view.getBoundingClientRect();
        vw = r.width; vh = r.height;
        fit = CHAPTERS.map((c) => {
          const k = Math.min((vw * 0.9) / c.width, (vh * 0.9) / c.height);
          const w = c.width * k, h = c.height * k;
          const s0 = Math.min(5, (vw * 0.7) / (c.bbox.w * w), (vh * 0.4) / (c.bbox.h * h));
          return { w, h, s0 };
        });
        pages.forEach((p, i) => gsap.set(p, { width: fit[i].w, height: fit[i].h, transformOrigin: "0 0" }));
      };

      const render = (P: number) => {
        const f = P * n;
        CHAPTERS.forEach((c, i) => {
          const u = f - i;
          const uc = clamp(u);
          let o = 1;
          if (u < 0) o = i === 0 ? 1 : clamp((u + 0.1) / 0.1);
          else if (u > 1) o = i === n - 1 ? 1 : clamp(1 - (u - 1) / 0.1);
          const t = ease(clamp((uc - 0.12) / 0.58));
          const sc = lerp(fit[i].s0, 1, t);
          const cx = lerp(c.bbox.x + c.bbox.w / 2, 0.5, t);
          const cy = lerp(c.bbox.y + c.bbox.h / 2, 0.5, t);
          gsap.set(pages[i], { x: vw / 2 - cx * fit[i].w * sc, y: vh / 2 - cy * fit[i].h * sc, scale: sc });
          gsap.set(drifts[i], { opacity: o });
          gsap.set(bars[i], { scaleX: clamp((u + 0.1) / 0.22) });
          gsap.set(notes[i], { opacity: o, y: (1 - o) * 14 });
          gsap.set(cites[i], { opacity: clamp((uc - 0.55) / 0.15) });
          drifts[i].style.pointerEvents = o > 0.5 ? "auto" : "none";
        });
        count.textContent = `${Math.min(n, Math.floor(f) + 1)} of ${n}`;
      };

      measure();
      render(0);
      ScrollTrigger.create({
        trigger: stage,
        start: "top top",
        end: `+=${n * 120}%`,
        pin: true,
        invalidateOnRefresh: true,
        onRefresh: (s) => { measure(); render(s.progress); },
        onUpdate: (s) => render(s.progress),
      });

      // idle: the pages breathe while nobody scrolls
      const idle = (t: number) => {
        const s = t * 0.001;
        drifts.forEach((d, i) => gsap.set(d, { y: Math.sin(s * 0.9 + i) * 3 }));
        gsap.set(".hx-page", { rotate: (i: number) => [-5, 2, 7][i] + Math.sin(s * 0.7 + i * 2) * 0.8 });
      };
      gsap.ticker.add(() => idle(performance.now()));
    }, el);

    return () => {
      ctx.revert();
      gsap.ticker.remove(tick);
      lenis.destroy();
      el.classList.remove("is-live");
    };
  }, []);

  return (
    <main className="home" ref={root}>
      <section className="hx" aria-labelledby="hx-h">
        <div className="hx-copy">
          <p className="mono hx-kicker">UNICEF Supply Division · prototype data</p>
          <h1 id="hx-h">
            <span className="hx-line"><span>What suppliers and</span></span>
            <span className="hx-line"><span>UNICEF Supply Division say</span></span>
            <span className="hx-line"><span>in their <span className="hx-mark"><i className="hx-bar" aria-hidden="true" />own reports</span></span></span>
          </h1>
          <p className="hx-lede">Every claim links to the PDF and page it came from. Figures are prototype data and have not been adjudicated.</p>
          <a className="hx-cue mono" href="#follow">Follow one claim back to its page</a>
        </div>
        <div className="hx-stack" aria-hidden="true">
          {CHAPTERS.map((c) => (
            <figure className="hx-page" key={c.pdf}>
              <img src={c.image} alt="" width={c.width} height={c.height} />
              {c.highlights.map((h, i) => (
                <i key={i} className="hl" style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%`, width: `${h.width * 100}%`, height: `${h.height * 100}%` }} />
              ))}
            </figure>
          ))}
        </div>
      </section>

      <section id="follow" className="pb" aria-labelledby="pb-h">
        <div className="pb-stage">
          <div className="pb-text">
            <h2 id="pb-h" className="mono pb-head">Three claims, each pulled back to its page <span className="pb-count" aria-hidden="true" /></h2>
            <div className="pb-notes">
              {CHAPTERS.map((c) => (
                <article className="pb-note" key={c.pdf}>
                  <p className="pb-supplier">{c.supplier}</p>
                  <blockquote>{c.text}</blockquote>
                  <p className="pb-cite mono">{c.pdf.replace(/_/g, " ").replace(".pdf", "")}, page {c.page}</p>
                  <p className="pb-tier"><span className="chip">Claim</span> {buyer.tiers.claim_extracted}. {c.verification}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="pb-view">
            {CHAPTERS.map((c) => (
              <div className="pb-drift" key={c.pdf}>
                <div className="pb-page">
                  <img src={c.image} alt={`${c.supplier} report, page ${c.page}, with the claim highlighted`} width={c.width} height={c.height} />
                  {c.highlights.map((h, i) => (
                    <i key={i} className="hl pb-hl" style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%`, width: `${h.width * 100}%`, height: `${h.height * 100}%` }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="tiers" aria-labelledby="tiers-h">
        <h2 id="tiers-h">A gap is a gap, never zero.</h2>
        <ul>
          {TIER_ORDER.map(([key, label]) => (
            <li key={key} className={`tier tier-${key}`}>
              <span className="tier-bar" aria-hidden="true" />
              <p className="mono tier-label">{label}</p>
              <p>{buyer.tiers[key]}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="dir" aria-labelledby="dir-h">
        <h2 id="dir-h" className="mono">Where to look</h2>
        {DIRECTORY.map((g) => (
          <div className="dir-group" key={g.name}>
            <h3 className="mono">{g.name}</h3>
            <ul>
              {g.rows.map(([to, name, text]) => (
                <li key={to}>
                  <Link to={to} className="dir-row">
                    <span className="dir-name"><i className="dir-mark" aria-hidden="true" /><span>{name}</span></span>
                    <span className="dir-text">{text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="rules" aria-labelledby="rules-h">
        <h2 id="rules-h" className="mono">How to read every page</h2>
        <ol>
          {buyer.disclaimers.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}
