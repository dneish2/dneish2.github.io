# dneish2.github.io

Personal site of David Neish — part portfolio, part writing. Live at [dneish2.github.io](https://dneish2.github.io).

The thesis: decision systems. I started as a game player optimizing decisions under pressure; now I build AI systems that do the same at enterprise scale. The site lets the work speak — numbers over adjectives — and invites you to play.

## Structure

```
index.html                              hero + origin + selected work + writing teasers
writing/index.html                      article index
writing/*.html                          essays (outline ships first, prose follows)
work/land-tax-sale/                     self-contained prototype (drop-in)
assets/css/main.css                     the whole design system, one file
assets/js/main.js                       scroll reveal + header state (~2KB)
assets/js/hero.js                       decision-graph canvas + scramble tagline (~7KB)
```

## Selected work

- **finplatform** — AI financial research terminal; tiered model router (local GPU → Claude), per-model credits, behavior evals. Flagship.
- **Passage** — translation workspace (text / document / image / voice) with segment-level review and an honest-error contract.
- **Prompting-101** — a field guide to prompting: techniques, copiloting model, domain templates. [Repo](https://github.com/dneish2/Prompting-101)
- **Real estate / design** — a land tax sale interface for St. Louis, an end-to-end product design, and Neighborhood Matchmaker.

## Principles

- Plain HTML/CSS/JS. No framework, no build step, no CDN dependencies.
- Dark, "terminal × editorial": serif headlines, mono numerals, one amber accent.
- Motion respects `prefers-reduced-motion`; everything renders with JS disabled.
- No lorem ipsum, no fluff. If a page isn't ready, it says so honestly.

## Local preview

```bash
git clone https://github.com/dneish2/dneish2.github.io
cd dneish2.github.io
python -m http.server 8080   # root-relative URLs need a server, not file://
```
