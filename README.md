# AI-Assisted Grading Assistant — Live Demo

A working demo: upload a photo of a student's handwritten answer, set a marking
guide, and get an AI-suggested grade with reasoning — which a teacher always
reviews and can override before confirming.

**Cost: $0.** Hosting is free on Vercel's Hobby plan, and grading runs on
Google's Gemini API free tier (no credit card required for either).

---

## How it's built

- `index.html`, `style.css`, `script.js` — the frontend, plain HTML/CSS/JS,
  no framework needed
- `api/grade.js` — a Vercel serverless function that calls the Gemini API
  server-side, so your API key never touches the browser
- Client-side image compression before upload, to keep photos comfortably
  within request size limits

---

## Deploy it yourself (about 5 minutes)

### 1. Get a free Gemini API key
Go to **[aistudio.google.com](https://aistudio.google.com)** → click
**"Get API key"** → create one. No credit card needed.

### 2. Push this folder to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```
(Create the empty repo on GitHub first if you haven't already.)

### 3. Import into Vercel
1. Go to **[vercel.com](https://vercel.com)** and sign in (free, GitHub login works)
2. Click **"Add New" → "Project"**
3. Select the GitHub repo you just pushed
4. Before deploying, open **"Environment Variables"** and add:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** *(paste the key from step 1)*
5. Click **Deploy**

Vercel will give you a live URL like `your-project.vercel.app` — that's your
finished, hosted app. Every time you push to GitHub, it redeploys
automatically.

---

## Testing locally before deploying (optional)

```bash
npm install -g vercel
cp .env.example .env.local   # then paste your real key into .env.local
vercel dev
```
This runs the site at `http://localhost:3000` with the serverless function
working exactly like it will in production.

---

## Notes for the pitch

- **Free tier limits:** Gemini's free tier is generous for a live demo, but
  has a daily request cap — fine for presentations and small pilots, worth
  upgrading if this ever goes school-wide.
- **Data handling:** images are sent to Gemini for grading only and are not
  stored by this app. If you adopt this for real use, check Google's current
  data retention terms for the API tier you're on.
- **Teacher-in-the-loop by design:** every AI-suggested score is editable
  before the "Confirm Grades" step — this app never finalizes a grade on its
  own.
