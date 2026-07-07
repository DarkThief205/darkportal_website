# DarkPortal Vercel build - logo restore

This ZIP restores the site logos to the uploaded black-square DarkBot logo.

Changes included:
- Replaced the on-site navbar/logo assets with the requested logo.
- Rebuilt favicon files (`favicon.ico`, 32/48/192/512, apple-touch-icon).
- Rebuilt Open Graph/Search preview images with the requested logo.
- Updated cache-busting query strings from `brand-v2` to `logo-v3` so the browser and Google are less likely to keep the old icon.
- Added CSS override to remove the extra rounded-card wrapper/border around the logo.

Deploy this ZIP to Vercel, then hard-refresh the site. Search engines may still need a few days to update cached favicons/previews.
