# AppViewX Skill Assessment

Interactive 12-question knowledge assessment for the [AppViewX Academy](https://academy.appviewx.com). Diagnoses learner skill gaps across CLM, PKIaaS, Automation, and Platform knowledge, then recommends a personalized learning path.

## Features

- Role & experience intake for personalized results
- 12 scenario-based questions with instant feedback
- Score breakdown by knowledge area (CLM, PKIaaS, Automation, Platform)
- Personalized course recommendation with direct Academy links
- Certification path CTA (launching December 2026)

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/surencarter/appviewx-skill-assessment)

Or manually:
1. Fork this repo
2. Import into [Vercel](https://vercel.com)
3. Deploy — no environment variables needed

## Embed in Skilljar

Add to a Skilljar Custom Page via iframe:

```html
<iframe
  src="https://your-vercel-url.vercel.app"
  width="100%"
  height="700"
  frameborder="0"
  style="border-radius:16px;">
</iframe>
```

Or link directly from the Academy homepage as a CTA button.

## Tech

Pure HTML/CSS/JavaScript — no backend, no API keys, no dependencies. All scoring logic runs client-side.
