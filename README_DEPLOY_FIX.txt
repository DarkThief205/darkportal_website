NETLIFY DEPLOY FIX

This is a static/no-build version. It intentionally has no package.json and no .env.

If deploying from Git:
1. In Netlify, open Site configuration > Build & deploy > Continuous deployment > Build settings.
2. Click Edit settings.
3. Set Build command to blank, or to:
   echo "No build needed"
4. Set Publish directory to:
   .
5. Save and trigger deploy again.

Your failed log shows:
  commandOrigin: ui
  Build command from Netlify app: npm install

That means Netlify UI is overriding this repository's netlify.toml and trying to run npm install even though this project has no package.json.

If deploying manually:
Use Netlify Deploys > Deploy manually and drag this ZIP/folder. No build command is needed.
