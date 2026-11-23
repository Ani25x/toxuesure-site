# toxuesure.in — deploy notes

## Upload to Hostinger

hPanel → File Manager → `public_html`. Delete the old site's files first
(`styles.css`, `main.js`, `gsap/`, `img/`, old `fonts/open-sauce-*`), then upload the
contents of this repo (not the folder itself):

```
index.html  robots.txt  sitemap.xml
css/      site.css
js/       main.js (fog, lens, chapters), measure.js (dataLayer events)
vendor/   three/three.module.js, three/three.core.js (Three.js r187)
fonts/    Archivo Expanded ExtraBold, Archivo Regular, IBM Plex Mono (woff2)
media/    intro.mp4, intro.jpg, og.jpg, favicon.svg, play/, process/
```

Don't upload `.git/`, `.gitignore` or this file.

## How it works

- No build step. Plain HTML + CSS + one ES module. Three.js is self-hosted and loaded
  through an import map.
- One fixed WebGL canvas draws the fog: everything behind it (hidden hero lines,
  chapter video) is blurred at 1/6 resolution, veiled at 72% fog, with a slow drifting
  noise. A lens follows the cursor (press-and-hold on touch) and shows it sharp.
- Chapters clear as they reach the middle of the screen. The `<video>` in each chapter
  feeds the WebGL texture; without WebGL it shows with a CSS fog instead.
- Phones render at 1.5x max; the canvas stops drawing once you scroll past Work.
- Brand system: fog #E9E9E6, ink #0A0A0A, dot #ED3B03, Archivo Expanded 800 / Archivo
  400 / IBM Plex Mono. Motion: cubic ease-out, no bounce, the dot lands last.

## Adding a chapter

Copy an `<article class="chapter" data-chapter>` block in `index.html`, point its
`<video>` at a new file in `media/` (H.264 MP4, 1080p, `-movflags +faststart`), give it
a poster jpg, and change the label, title and one line. Nothing else changes.

## Tracking (GTM-TCVJGQFV)

`js/measure.js` pushes the same events and variables as the old site, so existing GTM
triggers keep working: `contact_click`, `outbound_click`, `section_view`
(hero, work, play, process, about), `scroll_depth`. New: `lens_open` (method:
`pointer` or `touch`), the first time a visitor opens the fog lens. Add a Custom Event
trigger and a GA4 event tag for it in GTM if you want it counted.
