# Deploying to Vercel

This project is a static frontend, so it can be deployed to Vercel without a build step.

## Option 1: Deploy from the Vercel Dashboard

1. Push the project to a GitHub repository.
2. Sign in to [Vercel](https://vercel.com/).
3. Click `Add New...` -> `Project`.
4. Import the GitHub repository for this project.
5. Use these settings:

   - Framework Preset: `Other`
   - Build Command: leave empty
   - Output Directory: leave empty
   - Install Command: leave empty

6. Click `Deploy`.

Vercel will serve the project as a static site directly from the repository root.

## Option 2: Deploy with the Vercel CLI

Install the CLI:

```bash
npm i -g vercel
```

Then, from the project directory:

```bash
cd bad-mermaid
vercel
```

For production deployment:

```bash
vercel --prod
```

During the first run, Vercel may ask a few questions. For this project, the safe answers are:

- Set up and deploy: `Yes`
- Which scope: choose your account or team
- Link to existing project: `No` for the first deployment
- Project name: `bad-mermaid` or your preferred name
- Directory: `./`
- Override settings: `No`

## Recommended Project Structure

Vercel will serve these files directly from the repository root:

- `index.html`
- `styles.css`
- `app.js`
- other local JS modules
- `favicon.svg`

No server code is required.

## Notes

- Because the app loads Mermaid from a CDN, the deployed site needs internet access in the browser to fetch that dependency.
- If you change only static files, redeploying is enough. No build cache handling is needed.
- If the favicon does not update immediately, that is usually browser cache, not a Vercel issue.

## Included `vercel.json`

This project already includes a minimal `vercel.json`:

```json
{
  "cleanUrls": true
}
```

This is still a simple static-site deployment. The config just makes the behavior explicit.
