# Dark Portal brand/search preview fix

This package includes an updated favicon/logo set and a new square search preview image.

Changed:
- Rebuilt favicon files with an opaque dark/purple background so Google does not place the logo on a white-looking circle.
- Replaced the on-site logo asset with a transparent Dark Portal mark.
- Added `public/assets/search-preview.png` and pointed Open Graph/Twitter/thumbnail metadata to it.
- Updated `site.webmanifest` icons with `any maskable` support.

After deploying, Google may need a few days/weeks to recrawl the page before the search result thumbnail and site icon update.
