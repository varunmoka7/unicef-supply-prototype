import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import type { Buyer } from "../lib/buyer";
import { CHAPTERS, DIRECTORY, type Chapter } from "./homeData";
import "./Index.css";

// Concept: every number sits on a page. A highlighter draws the claim on the real PDF page,
// and the citation never leaves the claim. One driver (scroll progress) moves the pinned scene.

const pct = (n: number) => `${n * 100}%`;

function Highlights({ c, crop }: { c: Chapter; crop?: { x: number; y: number; w: number; h: number } }) {
  return (
    <>
      {c.highlights.map((h, i) => (
        <span
          key={i}
          className="hl"
          style={{
            left: pct(crop ? (h.x - crop.x) / crop.w : h.x),
            top: pct(crop ? (h.y - crop.y) / crop.h : h.y),
            width: pct(crop ? h.width / crop.w : h.width),
            height: pct(crop ? h.height / crop.h : h.height),
          }}
        />
      ))}
    </>
  );
}

// A cut-out of the real page: the claim's own lines with a little margin, nothing redrawn.
function Crop({ c }: { c: Chapter }) {
  const padX = 0.04, padY = 0.04;
  const crop = {
    x: Math.max(0, c.bbox.x - padX),
    y: Math.max(0, c.bbox.y - padY),
    w: Math.min(1, c.bbox.w + padX * 2),
    h: c.bbox.h + padY * 2,
  };
  return (
    <div className="crop" style={{ aspectRatio: (crop.w * c.width) / (crop.h * c.height) }}>
      <img
        src={c.image}
        alt={`${c.pdf}, page ${c.page}, with the claim highlighted`}
        style={{ width: pct(1 / crop.w), left: pct(-crop.x / crop.w), top: pct(-crop.y / crop.h) }}
      />
      <Highlights c={c} crop={crop} />
    </div>
  );
}

function Citation({ c }: { c: Chapter }) {
  return (
    <p className="cite">
      <span>{c.pdf}</span>
      <span>page {c.page}</span>
    </p>
  );
}

export default function Index({ buyer }: { buyer: Buyer }): JSX.Element {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!window.matchMedia) return; // jsdom has no matchMedia
    gsap.registerPlugin(ScrollTrigger, SplitText);
    const el = root.current!;
    const q = <T extends Element>(s: string) => Array.from(el.querySelectorAll<T>(s));
    const mm = gsap.matchMedia();

    // reduced motion: everything visible and still, no smooth scroll, no pin
    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(q(".hl"), { scaleX: 1 });
    });

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const lenis = new Lenis({ lerp: 0.12 });
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (t: number) => lenis.raf(t * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      // hero: the headline rises line by line, then the highlighter draws on the cut-out
      const split = SplitText.create(el.querySelector(".hero h1")!, { type: "lines", mask: "lines", autoSplit: true });
      const heroHl = q<HTMLElement>(".hero .hl");
      gsap.set(heroHl, { scaleX: 0 });
      gsap
        .timeline({ defaults: { ease: "expo.out" } })
        .from(split.lines, { yPercent: 105, duration: 1.1, stagger: 0.09 })
        .from(".hero-lede, .hero-links", { opacity: 0, y: 14, duration: 0.8, stagger: 0.1 }, "-=0.7")
        .from(".hero .crop", { clipPath: "inset(0 100% 0 0)", duration: 1.1 }, "-=1.1")
        .from(".hero .hero-cite", { opacity: 0, duration: 0.6 }, "-=0.5")
        .to(heroHl, { scaleX: 1, duration: 0.9, stagger: 0.18, ease: "power2.inOut" }, "-=0.2");
      // idle: the cut-out breathes while nothing else moves
      gsap.to(".hero .crop img", { scale: 1.035, duration: 7, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "30% 40%" });

      const scene = el.querySelector<HTMLElement>(".scene")!;
      const frames = q<HTMLElement>(".pg");
      const copies = q<HTMLElement>(".ch");
      const count = el.querySelector<HTMLElement>(".scene-count b")!;
      const bar = el.querySelector<HTMLElement>(".scene-bar i")!;

      const desktop = window.matchMedia("(min-width: 900px) and (min-height: 600px)").matches;
      if (desktop) {
        scene.classList.add("is-pinned");
        frames.forEach((f, i) => {
          gsap.set(f, i ? { clipPath: "inset(0 0 100% 0)", opacity: 0 } : {});
          gsap.set(f.querySelectorAll(".hl"), { scaleX: 0 });
        });
        copies.forEach((c, i) => gsap.set(c, { autoAlpha: i ? 0 : 1, y: i ? 40 : 0 }));

        const tl = gsap.timeline({
          defaults: { ease: "power2.inOut" },
          scrollTrigger: {
            trigger: scene,
            start: "top top",
            end: () => `+=${innerHeight * 3.2}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });
        tl.to(bar, { scaleX: 1, ease: "none", duration: CHAPTERS.length * 2 }, 0);
        CHAPTERS.forEach((_, i) => {
          const at = i * 2;
          if (i) {
            tl.to(frames[i - 1], { yPercent: -6, opacity: 0, duration: 0.7 }, at - 0.1)
              .to(copies[i - 1], { autoAlpha: 0, y: -40, duration: 0.5 }, at - 0.1)
              .set(frames[i], { opacity: 1 }, at)
              .to(frames[i], { clipPath: "inset(0 0 0% 0)", duration: 0.8 }, at)
              .to(copies[i], { autoAlpha: 1, y: 0, duration: 0.6 }, at + 0.25)
              .call(() => { count.textContent = String(i + 1); }, undefined, at + 0.4);
          }
          tl.to(frames[i].querySelectorAll(".hl"), { scaleX: 1, duration: 0.7, stagger: 0.12, ease: "power1.inOut" }, at + 0.7);
        });
        tl.call(() => { count.textContent = "1"; }, undefined, 0.01);
      } else {
        // phone and short screens: chapters stack, each highlighter draws when its page arrives
        q<HTMLElement>(".pg").forEach((f) => {
          const hls = f.querySelectorAll(".hl");
          gsap.set(hls, { scaleX: 0 });
          ScrollTrigger.create({
            trigger: f,
            start: "top 70%",
            once: true,
            onEnter: () => gsap.to(hls, { scaleX: 1, duration: 0.9, stagger: 0.15, ease: "power2.inOut" }),
          });
        });
      }

      // directory rows rise in as they arrive
      q<HTMLElement>(".dir-group").forEach((g) =>
        gsap.from(g.querySelectorAll(".dir-row"), {
          opacity: 0, y: 24, duration: 0.7, stagger: 0.07, ease: "expo.out",
          scrollTrigger: { trigger: g, start: "top 85%", once: true },
        }),
      );

      return () => {
        split.revert();
        gsap.ticker.remove(tick);
        lenis.destroy();
        scene.classList.remove("is-pinned");
      };
    });

    return () => mm.revert();
  }, []);

  const hero = CHAPTERS[0];

  return (
    <main className="home" ref={root}>
      <section className="hero" aria-labelledby="hero-h">
        <div className="hero-copy">
          <h1 id="hero-h">Every number sits on a page.</h1>
          <p className="hero-lede">
            UNICEF Supply Division and its vaccine suppliers write about climate in their own reports.
            This site keeps each claim next to the PDF page it came from. Figures are prototype data and
            have not been adjudicated.
          </p>
          <p className="hero-links">
            <Link className="btn" to="/suppliers"><span>Start with the suppliers</span></Link>
            <a className="btn btn-ghost" href="#claims"><span>See three claims on their pages</span></a>
          </p>
        </div>
        <figure className="hero-fig">
          <Crop c={hero} />
          <figcaption className="hero-cite">
            <span className="cite-sup">{hero.supplier}</span>
            <Citation c={hero} />
          </figcaption>
        </figure>
      </section>

      <section className="scene" id="claims" aria-labelledby="claims-h">
        <div className="stage">
          <header className="scene-head">
            <h2 id="claims-h">Three claims, each on its own page</h2>
            <p className="scene-count" aria-hidden="true"><b>1</b> / {CHAPTERS.length}<span className="scene-bar"><i /></span></p>
          </header>
          {CHAPTERS.map((c) => (
            <div className="chap" key={c.pdf}>
              <figure className="pg">
                <div className="pg-frame" style={{ aspectRatio: c.width / c.height, ["--ar" as string]: c.width / c.height }}>
                  <img src={c.image} alt={`${c.pdf}, page ${c.page}`} width={c.width} height={c.height} loading="lazy" />
                  <Highlights c={c} />
                </div>
              </figure>
              <article className="ch">
                <p className="ch-sup">{c.supplier}</p>
                <blockquote><p>{c.text}</p></blockquote>
                <Citation c={c} />
                <p className="ch-tag">Model-extracted claim, not source-checked by a person. {c.verification}</p>
              </article>
            </div>
          ))}
        </div>
      </section>

      <section className="dir" aria-labelledby="dir-h">
        <h2 id="dir-h">Where to look next</h2>
        {DIRECTORY.map((g) => (
          <div className="dir-group" key={g.name}>
            <h3>{g.name}</h3>
            <ul>
              {g.rows.map(([to, name, text]) => (
                <li className="dir-row" key={to}>
                  <Link className="dir-name" to={to}>{name}</Link>
                  <span className="dir-text">{text}</span>
                  <span className="dir-go" aria-hidden="true">→</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="home-rules" aria-labelledby="rules-h">
        <h2 id="rules-h">How to read every page</h2>
        <ol>
          {buyer.disclaimers.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}
