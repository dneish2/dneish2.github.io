# dneish2.github.io

Personal site of David Neish — part portfolio, part writing. Live at [dneish2.github.io](https://dneish2.github.io).

The thesis: decision systems. I started as a game player optimizing decisions under pressure; now I build AI systems that do the same at enterprise scale. The site lets the work speak — numbers over adjectives — and invites you to play.

## Structure

```
index.html                              hero + origin + selected work + resume + writing teasers
writing/index.html                      article index
writing/*.html                          essays (outline ships first, prose follows)
work/deal-lens/                         Trusted Concierge prototype, embedded live
assets/css/main.css                     the whole design system, one file
assets/js/main.js                       scroll reveal + header state + footer typewriter (~2.5KB)
assets/js/hero.js                       decision-graph canvas + scramble tagline (~7KB)
assets/resume/                          drop david-neish-resume.pdf here
```

## Selected work

- **finplatform** — AI financial research terminal; tiered model router (local GPU → Claude), per-model credits, behavior evals. Flagship.
- **Passage** — translation workspace (text / document / image / voice) with segment-level review and an honest-error contract.
- **Deal Lens** — tax-sale property underwriting (St. Louis), a live consent-first concierge prototype, and Neighborhood Matchmaker. Underwriting engine blocked on MLS access.
- **Prompting-101** — a field guide to prompting: techniques, copiloting model, domain templates. [Repo](https://github.com/dneish2/Prompting-101)
- **MAGE** — a "currently exploring" mention: a domain-router coaching concept from HCI coursework at Indiana, deliberately not treated as a numbered showcase.

## Principles

- Plain HTML/CSS/JS. No framework, no build step, no CDN dependencies.
- Dark, "terminal × editorial": serif headlines, mono numerals, one amber accent.
- Motion respects `prefers-reduced-motion`; everything renders with JS disabled.
- No lorem ipsum, no fluff. If a page isn't ready, it says so honestly.

## Local preview

Double-click `index.html` — the site uses relative paths, so it renders fully from `file://`, no server needed. (A server works too: `python -m http.server 8080`.)

## Drop-in slots

- `assets/img/portrait.jpg` — profile photo; the About placeholder swaps itself out the moment the file exists (4:5 crop looks best).
- `assets/resume/david-neish-resume.pdf` — the resume card, header nav, and footer link all point here already; nothing else to wire up.
- Deal Lens: [design file](https://www.figma.com/design/0eq7oAzPJAXl2CMdizThrB/Real-Estate-%E2%80%94-Deal-Lens) and [interactive prototype](https://www.figma.com/proto/0v0CEnBK8G07Vl0bvgppOV) are linked live from the mini-cards. `work/deal-lens/` runs on Austin, TX sample data (disclosed in its own header bar) — swap in St. Louis data whenever that's ready.
