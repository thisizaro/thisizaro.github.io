---
title: Serving a Resume on GitHub Pages
featured: true
layout: post
---

# Serving a Resume on GitHub Pages: Caching Pitfalls and a Clean Long-Term Fix

I host my portfolio and resume using **GitHub Pages**. Recently, after updating my resume PDF, I noticed something odd: on some devices, the link still opened an **older version**, even though the repository clearly had the latest file.

After testing across devices and networks, it became clear that this wasn’t a deployment issue. The problem was **browser caching**, which is particularly aggressive for PDFs served as static assets.

---

## What I Found & the Options I Considered

After some research, I found a few possible solutions.

### 1. Rename the Resume PDF Every Time

Example:

```text
resume_v1.pdf → resume_v2.pdf
```

This works because browsers treat it as a brand‑new file.

**But here’s the problem:**

- I’ve already shared my resume link on LinkedIn
- Submitted it on multiple job portals
- Sent it via emails and forms

Changing the filename means updating links **everywhere**, every single time.

> Not scalable. Not safe.

---

### 2. Cache‑Busting with Query Parameters

Example:

```text
resume.pdf?v=2
```

This sometimes works for images and scripts.

**But for PDFs:**

- Many browsers ignore query parameters
- Embedded PDF viewers may still serve cached files

> Too unreliable for something as important as a resume.

---

### 3. Overwrite the Same PDF and Hope for the Best

This is basically trusting browser cache expiry magic 😄

> Which… is not a strategy.

---

## The Solution I Went With

I chose a **stable link + redirect** approach.

### How It Works

- I created **one permanent resume URL** that never changes
- That URL points to an **HTML file**
- The HTML file instantly redirects to a **versioned resume PDF**
- When I update my resume, I only update the redirect target

### Result

- Old links still work
- Recruiters always see the latest resume
- No cache issues
- No “please clear your cache” emails

This felt like the most **robust and professional** solution.

---

## Technical Breakdown (For the Curious)

### Why This Problem Happens

- PDFs are treated as static assets
- GitHub Pages serves them with long‑lived cache headers
- Browsers aggressively reuse cached PDFs without rechecking

---

### Why Redirecting via HTML Works

- HTML files are less aggressively cached
- Browsers re‑fetch them more often
- Cache behavior can be influenced using meta tags

---

### Important Meta Tags Used

```html
<meta http-equiv="cache-control" content="no-cache" />
<!-- Forces the browser to revalidate before using cached content -->

<meta http-equiv="expires" content="0" />
<!-- Marks the page as already expired -->

<meta http-equiv="pragma" content="no-cache" />
<!-- Fallback for older browsers -->

<meta http-equiv="refresh" content="0; url=../resume_v2.pdf" />
<!-- Instantly redirects to the latest resume version -->
```

---

## End Result

- One permanent resume link
- Internally versioned PDFs
- Cache‑safe behavior on static hosting

A clean, future‑proof way to serve a resume on GitHub Pages
