# Netlify build fix v70

This package removes the generated package-lock.json because the previous lockfile contained internal registry URLs from the build environment, which can make Netlify hang at "Installing npm packages".

What changed:
- removed package-lock.json
- set npm registry explicitly to https://registry.npmjs.org/
- disabled package-lock generation for this Netlify package
- kept the v69 login/session fixes
- kept the v67 Discord Open Graph preview metadata/banner

In Netlify, keep your env vars in Site settings > Environment variables. Do not upload .env files.
