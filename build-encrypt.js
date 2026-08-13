// Builds an encrypted, password-gated index.html from a plaintext HTML file.
// AES-256-GCM, key = PBKDF2(password, salt, ITER, SHA-256). Public host holds only ciphertext.
// Mirrors shrimpcity/build-encrypt.js; login card restyled for Dashboard (clean light theme).
const fs = require('fs');
const crypto = require('crypto');

const SRC = process.argv[2];
const OUT = process.argv[3];
// DASH_PW is current; CC_PW/MIR_PW/SC_PW still work — the demo has been renamed three times and
// the password never changed, so old muscle memory shouldn't fail a deploy.
const PW  = process.env.DASH_PW || process.env.CC_PW || process.env.MIR_PW || process.env.SC_PW;
const ITER = 200000;
if (!SRC || !OUT || !PW) { console.error('usage: DASH_PW=xxx node build-encrypt.js <src.html> <out.html>'); process.exit(1); }

const plaintext = fs.readFileSync(SRC, 'utf8');
const salt = crypto.randomBytes(16);
const iv   = crypto.randomBytes(12);
const key  = crypto.pbkdf2Sync(PW, salt, ITER, 32, 'sha256');
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const ct  = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
const tag = cipher.getAuthTag();
const data = Buffer.concat([ct, tag]);           // ct||tag  (SubtleCrypto expects tag appended)
const b64 = b => b.toString('base64');
const ENC = { salt: b64(salt), iv: b64(iv), data: b64(data), iter: ITER };

// sanity: decrypt back in Node to prove the blob is valid before we ship it
(function selfTest(){
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv);
  d.setAuthTag(tag);
  const out = Buffer.concat([d.update(ct), d.final()]).toString('utf8');
  if (out !== plaintext) { console.error('SELFTEST FAILED'); process.exit(2); }
})();

const page = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dashboard</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>%F0%9F%A6%90</text></svg>">
<style>
  html,body{margin:0;height:100%}
  body{background:#f4f5f7;color:#1b2230;
    font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    -webkit-font-smoothing:antialiased;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{background:#fff;border:1px solid #e8eaf0;border-radius:16px;padding:30px 28px;width:320px;
    box-shadow:0 1px 2px rgba(16,24,40,.04),0 18px 44px rgba(16,24,40,.10);text-align:center}
  .mark{display:inline-grid;place-items:center;width:44px;height:44px;font-size:34px;line-height:1;margin-bottom:10px}
  .hd{font-size:20px;font-weight:700;letter-spacing:-.02em;margin:0}
  p{color:#6b7385;font-size:13px;margin:6px 0 18px}
  input{width:100%;box-sizing:border-box;font-family:inherit;font-size:15px;padding:11px 13px;
    background:#f7f8fa;color:#1b2230;border:1px solid #d9dce6;border-radius:10px;margin-bottom:10px}
  input:focus{outline:none;border-color:#4263eb;background:#fff}
  button{width:100%;font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;
    background:#1b2230;color:#fff;border:0;border-radius:10px;padding:12px}
  button:hover{background:#2a3346}
  #err{color:#e03131;font-size:12.5px;min-height:16px;margin-top:10px}
</style>
<div class="card">
  <div class="mark">🦐</div>
  <h1 class="hd">Dashboard</h1>
  <p>Enter password to view.</p>
  <input id="pw" type="password" autofocus autocomplete="off" spellcheck="false">
  <button id="go">Enter</button>
  <div id="err"></div>
</div>
<script>
const ENC=${JSON.stringify(ENC)};
const b64d=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function decrypt(pw){
  const salt=b64d(ENC.salt), iv=b64d(ENC.iv), data=b64d(ENC.data);
  const base=await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ENC.iter,hash:'SHA-256'},
    base, {name:'AES-GCM',length:256}, false, ['decrypt']);
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv}, key, data);
  return new TextDecoder().decode(pt);
}
const pw=document.getElementById('pw'), err=document.getElementById('err');
async function tryPw(){
  err.textContent='';
  try{
    const html=await decrypt(pw.value);
    document.open(); document.write(html); document.close();
  }catch(e){ err.textContent='Wrong password'; pw.value=''; pw.focus(); }
}
document.getElementById('go').addEventListener('click', tryPw);
pw.addEventListener('keydown', e=>{ if(e.key==='Enter') tryPw(); });
</script>
`;

fs.writeFileSync(OUT, page);
console.log('OK wrote', OUT, '(', page.length, 'bytes, ciphertext', ENC.data.length, 'b64 )');
