# Rooftop Radio — original game music

64-second stereo loop, 120 BPM, 32 bars. Playful plucked synth lead, warm chord stabs, bouncing bass, synthesized kick/snare/hat, and a quieter answering arpeggio. The tail wraps into the opening rather than ending abruptly.

Created for this project using `scripts/compose-rooftop-music.cjs`. All notes, arrangement, oscillators and deterministic noise percussion are defined there. No downloaded songs, third-party samples, sampled instruments, MIDI files or existing-song references were used. The reproducible output is `src/assets/audio/rooftop-radio.wav` (22,050 Hz, stereo PCM16). Keep this source and document as provenance. Original synthesis cannot guarantee that an automated platform will never issue a mistaken match.

`src/services/audioService.ts` uses the new loop with the existing sound setting and pause/resume flow. Playback initialization is serialized so concurrent starts do not create overlapping music players; pausing during initialization prevents late playback. Music remains offline and its volume leaves space for coin/drone effects.
