# Mirador

A small, self-contained illustrative web demo — a "dispatcher's wall" for the first mile of
shrimp production. Four screens: a **Status** hub, a transit-style **Routes** diagram, a
**Satellite** farm view, and a delivery **Scorecard**. Vanilla HTML/JS + `<canvas>`, no build step
to *run* it, works offline.

(The repository is still named `command-center`, the demo's original name, so the published URL
stays stable for anyone who already has the link.)

## Password-gated

The published page (`index.html`) contains **only AES-256-GCM ciphertext** plus a tiny in-browser
decryptor (Web Crypto, no libraries). Entering the correct password derives the key
(PBKDF2-SHA256, 200k iterations) and decrypts the app in the browser. Without the password, the page
holds no readable content.

## Why two repositories

- **This public repo** hosts only the *encrypted* page, so it can be served on GitHub Pages at a
  public URL without exposing any readable content.
- The **editable plaintext source** lives in a **separate private repo** and is never committed here
  (see `.gitignore`). That keeps the source — and the illustrative data baked into it — off the
  public web, while still allowing a public, password-gated link.

In short: the plaintext never leaves the private repo; only ciphertext is ever published.

## Build / update

1. Edit the plaintext source (in the private repo).
2. Regenerate the encrypted page. The password is passed via an env var and is **never** committed:
   ```
   MIR_PW='<deployment-password>' node build-encrypt.js source.html index.html
   ```
3. Commit the regenerated `index.html` here and push — GitHub Pages redeploys automatically.

To change the password, just rebuild with a different `MIR_PW` and push.

## Running locally

Web Crypto needs a secure context, so serve over `http://localhost` (e.g. `python3 -m http.server`)
rather than opening the file via a `file://` path.
