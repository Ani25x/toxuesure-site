# toxuesure.in — deploy notes

## 1. Upload

Hostinger → hPanel → File Manager → `public_html`

Upload the contents of this folder (not the folder itself):

```
index.html
styles.css
main.js
fonts/    (5 woff2 files)
img/      (alaziz.webp, og.png)
gsap/     (gsap.min.js, ScrollTrigger.min.js)
```

Delete any Hostinger placeholder `index.html` / `default.php` first.
Do **not** upload `.git/` or `.gitignore` — those are for version control,
not the live site.

## 2. Before it goes live

**a. GTM container ID.** Already set to `GTM-TCVJGQFV` in both places
(the `<head>` script and the `<noscript>` iframe). Nothing to change.

**b. Email.** Create `aniketpattebahadur@toxuesure.in` in Hostinger → Emails
*before* launch. The address is already on the page; it just needs to exist.

**c. HTTPS.** Hostinger → SSL → issue the free certificate, and force HTTPS.

## 3. GTM + GA4 setup

Container is `Web`. Inside it:

**Tags**
- GA4 Configuration → your Measurement ID → trigger: All Pages
- GA4 Event `outbound_click` → trigger: Custom Event `outbound_click`
- GA4 Event `contact_click` → trigger: Custom Event `contact_click`
- GA4 Event `section_view` → trigger: Custom Event `section_view`
- GA4 Event `scroll_depth` → trigger: Custom Event `scroll_depth`

**Data Layer Variables to create** (names must match exactly):
`link_domain`, `link_url`, `link_id`, `method`, `section_id`, `percent_scrolled`

The page pushes these into `dataLayer` already — `main.js` handles it. GTM owns
the tag configuration, the page owns nothing but the events. That separation is
the point, and it is what you would tell a client to do.

**Verify in Preview mode**, not by assuming:
- `page_view` fires exactly once, not twice
- `contact_click` fires when the email link is clicked
- `outbound_click` fires on the alazizparfums.com link with the right `link_domain`
- `scroll_depth` fires at 25/50/75/100 and each only once

Then register `outbound_click`, `contact_click`, `section_view`, `scroll_depth`
as Key Events in GA4 if you want them counted as conversions.

## 4. Also worth doing

- Google Search Console: verify the property, submit the URL.
- Check the OG card renders: paste `https://toxuesure.in/` into LinkedIn's
  Post Inspector.
- Add the URL to your LinkedIn profile (Contact info → Website).

## 5. Version control (GitHub)

This folder is already a git repo (`git log` shows one commit). I couldn't
push it from here — this sandbox has no network path to github.com — so to
get it onto GitHub:

1. Create an empty repo on github.com (no README, no .gitignore — this
   folder already has both).
2. On your own machine, `cd` into this folder and run:
   ```
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin master
   ```

From then on, deploy by pushing to GitHub and either uploading the changed
files to Hostinger by hand, or connecting the repo to a host that deploys
from git directly (Cloudflare Pages, Netlify, Vercel all do this on their
free tiers) if you want to drop the manual Hostinger upload step later.

## Notes on how this is built

No framework, no build step, no dependencies. Fonts are self-hosted, so
there is no third-party request blocking first paint. Images are WebP and
lazy-loaded below the fold.

Motion runs on GSAP + ScrollTrigger (self-hosted in `gsap/`, ~115KB total,
loaded after the content so it never blocks first paint) and is fully
disabled under `prefers-reduced-motion` — see the top of `main.js`. Nothing
moves to impress; it moves to sequence attention.

If you later add a second case study page, copy `index.html`, keep the same
`styles.css` and `main.js`, and change only the content between the
`<section>` tags.
