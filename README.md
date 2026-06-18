# Clockchain — Website Redesign (2026)

Marketing site for **Clockchain** — a decentralized, cryptographically verifiable time standard.

Static site: plain HTML, CSS, and vanilla JS. No build step required.

## Structure

```
index.html              Home page (single long-scroll)
styles.css              All site styles
app.js                  Nav, scroll progress, Connect dropdown, article modal
globe.js                three.js globe (intro section)
hero-orbit.js           Hero orbital-logo animation (Sun / Earth / Moon)
tweaks-panel.jsx        Tweaks panel shell (React, in-browser Babel)
tweaks-app.jsx          Design tweaks (variant, accent, fonts, weights, density)
playground.html         Time-oracle interactive demo  (+ playground.css / .js)
Mobile Preview.html     Phone-framed preview of the home page
blog/                   Blog post(s)  (+ blog-base.css)
assets/                 Favicons, logo, blog imagery, press logos
```

External libraries (three.js, React, Babel, Google Fonts) load from CDNs — an internet connection is needed for the globe, tweaks panel, and webfonts.

## Running locally

It's a static site — open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploying with GitHub Pages

Push this folder to a repo, then **Settings → Pages → Build and deployment → Deploy from a branch → main / root**. The site is served as-is.

## Notes

- The hero animation has a hidden tuning panel: append `?tune` to the URL (or press `Shift+T`) to open sliders, then "Copy settings" to bake values into `hero-orbit.js`.
- Social links open in a new tab. `x.com` and `discord.com` refuse to be shown inside embedded preview frames — they work normally in a real browser tab.
- The `/community` link is a placeholder route — add a community page or repoint it before launch.
