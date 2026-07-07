# Vercel Analytics + Speed Insights

Added Vercel Web Analytics and Speed Insights tracking scripts to 18 HTML pages.

Included snippets:

```html
<script>
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
</script>
<script defer src="/_vercel/insights/script.js"></script>
<script defer src="/_vercel/speed-insights/script.js"></script>
```

After deployment, enable Web Analytics and Speed Insights in the Vercel dashboard and visit the live site. Data may take a short time to appear, and content blockers may block analytics requests.
