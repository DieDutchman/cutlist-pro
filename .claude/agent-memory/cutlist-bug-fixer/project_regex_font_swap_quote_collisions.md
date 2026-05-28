---
name: Bulk font-family regex swaps can break JS string quoting
description: When a regex pass rewrites 'Oswald' to 'Barlow' inside inline style strings, it can land single-quoted CSS font names inside single-quoted JS string literals, breaking the entire <script> block
type: project
---

A cleanup pass that replaced `font-family: 'Oswald'` with `font-family: 'Barlow'` across `dev.html` introduced a parse error at line ~13842 (renderUserRow). The fragment lived inside `${isMe ? '...' : ''}` of a parent template literal — a single-quoted JS conditional string containing an inline `style="font-family:'Barlow',sans-serif"`. The unescaped `'Barlow'` closed the JS string mid-attribute, throwing `SyntaxError: Unexpected identifier`, which killed the whole script block and prevented login (form rendered but `doLogin()` was undefined).

**Why:** The regex was font-name-aware but not JS-quote-aware. Inside backtick template literals single quotes are fine, but `${... ? '...' : '...'}` interpolations frequently use single-quoted strings, and those collide with the CSS font name's own single quotes.

**How to apply:**
- After any bulk font-family / inline-style regex pass, run `node --check` on the extracted `<script>` block to catch quote collisions before pushing.
- Search pattern that reliably finds these: `grep -nE "\? '[^']*'Barlow'|: '[^']*'Barlow'|= '[^']*'Barlow'"` (and same for any other font name swapped in).
- Fix by switching the offending JS string from `'...'` to backticks. Nested template literals inside `${}` of a parent template literal are valid JS.
- Symptom in browser: login form renders normally but Sign In button does nothing; console shows `Uncaught SyntaxError` at the broken line and `doLogin is not defined` when clicked.
