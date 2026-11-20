# Writing Timers

A small, calm timer app for writing, styled like a notebook page. Open it, tap an activity, and the timer starts. That's all.

- **Morning Page** – 10 minutes
- **Practice** – 1 hour
- **Draft** – 3 hours (with a break reminder halfway)

It works offline and opens full-screen once you add it to your phone's home screen.

---

## What's in this folder

| File | What it is |
|---|---|
| `index.html` | The app's page |
| `style.css` | Colours and layout |
| `app.js` | How the timers, sounds and settings work |
| `manifest.webmanifest` | Lets your phone install it like an app |
| `sw.js` | Makes it work offline |
| `icon.svg`, `icon-*.png`, `apple-touch-icon.png` | The app icon (fountain pen nib, black on white) in all the sizes phones need |
| `README.md` | This guide |

You don't need to edit any of these.

---

## Part 1 — Put it on GitHub Pages (free)

GitHub Pages hosts the app on the web so your phone can open it. You only do this once.

### 1. Make a GitHub account
1. Go to <https://github.com> and click **Sign up**.
2. Follow the steps (email, password, username). Your username becomes part of the app's web address, e.g. `https://yourname.github.io/Writer/`.

### 2. Create a repository (a folder on GitHub)
1. When signed in, click the **+** in the top-right corner, then **New repository**.
2. **Repository name:** `Writer`
3. Choose **Public** (GitHub Pages is free for public repositories).
4. Tick **Add a README file** — this just makes the next step easier.
5. Click **Create repository**.

### 3. Upload the app files
Do this on a computer (it's much easier than on a phone).

1. In your new repository, click **Add file → Upload files**.
2. Open this app's folder on your computer. Select **all the files inside it** and drag them onto the GitHub page.
   - Drag the files themselves, not the folder that contains them. `index.html` must end up at the top level.
   - When asked, let it replace the existing `README.md`.
3. Wait until every file shows in the list, then click the green **Commit changes** button at the bottom.
4. Check: on the repository's main page you should see 12 files, including `index.html`, `app.js` and `apple-touch-icon.png`.

### 4. Turn on GitHub Pages
1. In the repository, click **Settings** (the tab along the top).
2. In the left-hand menu, click **Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Under **Branch**, choose **main** and **/ (root)**, then click **Save**.
5. Wait 1–2 minutes and refresh the page. A box will appear saying **"Your site is live at …"** with your link, something like
   `https://yourname.github.io/Writer/`
6. Open that link to check it works.

---

## Part 2 — Add it to your phone's home screen

### iPhone (use Safari)
1. Open **Safari** and go to your link (`https://yourname.github.io/Writer/`).
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen**.
4. Make sure **Open as Web App** is on (if shown), then tap **Add**.
5. Open it from the new yellow-nib icon on your home screen. It opens full-screen.

### Android (use Chrome)
1. Open **Chrome** and go to your link.
2. Tap the **⋮** menu (top-right).
3. Tap **Install app** (or **Add to Home screen**), then **Install**.
4. Open it from the new icon.

Open it once while online; after that it works offline too.

---

## Using it

- The app opens straight onto your three timers. Tap one and it starts at once, with a single wooden click.
- An encouraging word appears large for about 5 seconds, then settles to a small line at the bottom. (Tap it to move it out of the way sooner.)
- **Pause / Resume** – stops and continues the countdown. Reminders wait while paused.
- **Reset** – sets the timer back to its full length and leaves it paused. Tap **Start** when you're ready.
- **Stop** – ends the timer and goes back to the list.
- **Back arrow** (top left) – returns to all your timers while the timer keeps running. Its card shows the time left; tap it to go back to the timer. Starting a different timer while one is running asks before stopping the first.
- **Sounds:** one soft knock 2 minutes before the end; three slow knocks when time is up.
- **Draft break:** halfway through, two slow knocks and a yellow sticky note: *"Time for a 15-minute break"*. The timer keeps running — tap **Pause** when you take your break, and the note goes away.
- The screen stays on while a timer is running (on phones that support it).
- If the app gets closed by accident, it picks the timer back up where it should be when you reopen it.

### Settings (the gear ⚙︎ icon)
Change each activity's length, edit/add/remove the encouraging messages, turn the 2-minute warning and the Draft break reminder on or off, or reset everything to the defaults. Settings save automatically on your phone.

---

## Good to know

- **Keep the app open and on screen while timing.** Phones pause web apps when the screen locks or you switch to another app, so sounds can't play then. The time itself always stays correct — when you come back, the countdown catches up, and if time ran out you'll see "Time's up".
- **Sound on iPhone:** turn the volume up. On recent iPhones the app plays even with the silent switch on; on older ones, flip the silent switch off.
- **Sound needs one tap first** — any tap (like choosing a timer) wakes up the sound.

### Updating the app later
Upload the changed file(s) the same way (**Add file → Upload files**, then **Commit changes**). GitHub takes a minute or two to publish. On your phone, close the app fully and open it again (sometimes twice) to get the new version.
