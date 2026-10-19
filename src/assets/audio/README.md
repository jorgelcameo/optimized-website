# Required audio files

The required audio files are present here with these exact names:

- `beretta-reload.mp3` — short Beretta 9mm reload/cocking effect, played on button hover or focus.
- `beretta-shot.mp3` — Beretta 9mm gunshot effect, played on submit.

The asset deploy script syncs these files to `S3_AUDIO_KEY_PREFIX` (default `assets/audio`) and
skips this README. The site build rewrites their URLs to `ASSETS_BASE_URL`.

Sources (Pixabay Content License):

- Reload: [Berretta 9mm Cocking Slower](https://pixabay.com/sound-effects/film-special-effects-berretta-9mm-cocking-slower-105410/) by Paul368 (Freesound). Saved as `beretta-reload.mp3`.
- Shot: [9mm pistol shot](https://pixabay.com/sound-effects/film-special-effects-9mm-pistol-shot-6349/) by michorvath (Freesound). Saved as `beretta-shot.mp3`.
