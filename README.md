# Nunchi (v2: real site)

Static site + one Netlify Function. Accounts with Netlify Identity, profiles/lists/reviews/photos in Netlify Blobs,
full K-drama catalog with official posters and where-to-watch from TMDB, fetched at build time.

## Deploy on Netlify
1. Create the project from this folder (Git repo or `netlify deploy --build --prod`).
2. Project configuration → Environment variables:
   - `TMDB_API_KEY` = your TMDB v3 API key (required for the full catalog and posters)
   - `TMDB_REGIONS` = streaming countries, default `US,MX,CO,AR,CL,PE,ES`
3. Turn on Identity: https://app.netlify.com/projects/<site>/identity → Enable Identity.
   Optional: Registration → External providers → Google, so people can sign in with Google.
4. Redeploy. Each build refreshes the catalog; schedule a weekly build hook to keep streaming data fresh.

Without `TMDB_API_KEY` the build uses the 149-drama starter catalog (scripts/seed.js).
