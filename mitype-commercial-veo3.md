# MITYPE — 4K Cinematic Commercial
## Optimized Prompts for Google Veo 3.1
### Leveraging Native 4K, Native Audio, Multi-Shot Mode, Reference Image Consistency, and Camera Control

---

## VEO 3.1 PLATFORM SETTINGS (set these in the UI before generating)

| Setting | Value | Why |
|---|---|---|
| Resolution | **3840 × 2160 (4K UHD)** | Veo 3.1's native max; do not upscale |
| Frame rate | **24fps** for hero shots, **60fps** for slow-mo inserts | Cinematic standard + smooth slow-mo |
| Aspect ratio | **2.39:1** (cinemascope) — set as 16:9 with letterbox if 2.39 unavailable | True theatrical look |
| Duration per clip | **8–12 seconds** (max single generation) | Forces clean per-scene generations |
| Audio | **ON — full native audio generation** | Veo 3.1's killer feature: synced ambient + dialogue |
| Model | **Veo 3.1 Quality (Pro tier)**, NOT Fast | Quality tier has dramatically better prompt adherence |
| Seed | **Lock a seed per character pair** | Enables consistency across cuts within a scene |
| Reference images | **Upload 1–2 reference stills per scene** for character likeness | Critical for cross-shot subject consistency |

---

## VEO 3.1 PROMPT STRUCTURE
*(Veo 3.1 responds best to this exact ordering — keep this skeleton for every scene)*

```
[CAMERA / SHOT TYPE]: [movement, angle, lens, focal length]
[SUBJECT]: [age, ethnicity, wardrobe, distinguishing features — be specific]
[ACTION]: [verb-driven, present tense, beat by beat]
[SETTING]: [location, time of day, weather, environmental detail]
[LIGHTING]: [source, quality, direction, color temperature]
[STYLE]: [cinematic references, color grade, film stock emulation]
[AUDIO]: [ambient sound layers, dialogue if any, music absence/presence]
[MOOD]: [emotional register]
NEGATIVE PROMPT: [artifacts to avoid]
```

---

## REFERENCE-IMAGE WORKFLOW (do this first)

Before generating any video clip, generate **one hero still per scene** in Veo 3.1's image mode (or Imagen 4) using the prompts below as text. Approve the still — that becomes your reference image for the video generation. This gives you ~80% character consistency across the multiple shots within each scene.

For each scene you'll need:
1. A **wide establishing reference** (sets the location and pair)
2. A **close-up reference** of each character's face (locks the likeness)

Pass these into Veo 3.1's "Reference image" slot when generating the actual video clip.

---

## MASTER STYLE BLOCK
*(append to every scene prompt's STYLE field)*

```
Cinematic 4K, shot on ARRI Alexa 35 with Cooke S7/i anamorphic prime lenses, 2.39:1 cinemascope, 24fps, shallow depth of field at T2, organic anamorphic lens flares, subtle Kodak 5219 film grain, HDR Dolby Vision color grade, teal and amber color science, naturalistic skin tones across all skin shades, soft volumetric god-rays, atmospheric haze, dust motes catching light, photorealistic, A24 cinema meets Apple commercial aesthetic, polished but grounded, hyper-realistic human anatomy, perfect hand fidelity, no synthetic plastic skin, no uncanny valley.
```

---

# SCENE 1 — FITNESS & OUTDOORS (Rock Climbers)

### Reference image prompt (generate first)
```
A Black woman in her late 20s with locs tied back and a Filipino man in his early 30s, both in technical climbing gear, harnesses and chalk bags, mid-ascent on a vertical red sandstone cliff face in Moab Utah desert, golden hour sunrise, the woman just reaching the top, extending her hand down to her partner, photorealistic, ARRI Alexa cinematic look, anamorphic 2.39:1, deep amber and teal grade.
```

### Veo 3.1 video prompt (8 seconds)
```
CAMERA: Cinematic FPV drone shot, slow 270-degree counter-clockwise orbit around the subjects at chest height, anamorphic 35mm equivalent, shallow depth of field. Begins wide, push in to medium-close on faces by the end of the clip.

SUBJECT: A Black woman in her late 20s with locs tied back, light dusting of chalk on her hands and forearms, technical Patagonia climbing apparel in earth tones; and a Filipino man in his early 30s, lean build, athletic tape on his fingers, wearing a faded technical tee. Both in harnesses, ropes and carabiners visible.

ACTION: The woman has just summited a vertical red sandstone cliff. She kneels at the top edge and extends her right arm fully down. Her partner grasps her forearm. She pulls. He summits in a single fluid motion. They embrace standing on the edge, breathing hard, foreheads touching, eyes closed in a moment of earned joy.

SETTING: A 200-foot red sandstone cliff in the American Southwest desert (Moab, Utah aesthetic), sunrise breaking over the canyon rim behind them. Vast open canyon below stretching to the horizon. A single raven soars in the distance.

LIGHTING: Deep golden hour, warm amber key light from the cresting sun, natural canyon-wall bounce as fill, subtle anamorphic lens flares.

STYLE: [Insert Master Style Block]

AUDIO: Wind across the cliff face, a single distant raven call, the creak of carabiners and climbing rope under tension, controlled exhale, no music, no dialogue. Pure ambient.

MOOD: Triumphant, intimate, earned.

NEGATIVE PROMPT: text, watermark, logo, low resolution, blurry, distorted face, extra fingers, deformed hands, plastic skin, cartoon, anime, oversaturated, fake CGI lighting, motion blur artifacts, frame stutter, AI artifacts, uncanny valley.
```

### Transition out (generate as a separate 4-second clip)
```
CAMERA: Cinematic drone, breaks orbit and rockets vertically upward at high speed, motion-blur on edges, the climbers shrinking to specks below within 2 seconds, then the drone whip-pans through a single cumulus cloud.
SETTING: Desert canyon below, deep blue sky above, single white cloud filling final frame.
AUDIO: Whoosh of altitude change, wind intensifying, a soft sub-bass hit at the moment the cloud envelops the lens.
NEGATIVE PROMPT: choppy motion, frame artifacts, cgi-looking clouds.
```

---

# SCENE 2 — TRAVEL & CULTURE / HOBBIES (Stargazers)

### Reference image prompt (generate first)
```
A Brazilian-Indigenous woman in her 30s with long dark hair and warm wool poncho, beside a Lebanese man in his late 20s with short curly hair and a heavy parka, sitting on a black wool blanket on a flat obsidian volcanic ridge in the Atacama desert at deep blue-hour twilight, a vintage Celestron telescope beside them, the Milky Way arcing across the sky overhead, two steaming mugs of tea, photorealistic astrophotography lighting, anamorphic 2.39:1.
```

### Veo 3.1 video prompt (10 seconds)
```
CAMERA: Cinematic drone descending from inside a high cirrus cloud, emerging into open night sky, then descending laterally and tracking past the subjects at eye level, finally rising behind them to reveal the full Milky Way overhead. Telephoto compression on the close-up beat. 65mm equivalent.

SUBJECT: A Brazilian-Indigenous woman in her 30s, long dark hair, wool poncho in natural dyes, warm earth tones; and a Lebanese man in his late 20s, short curly black hair, heavy charcoal parka. Their breath visible in the cold air.

ACTION: The woman points at a constellation overhead with her right hand. The man follows her finger and laughs softly. She leans her shoulder into his. He whispers something inaudible. They both look up, faces lit faintly from below by an amber hand-warmer light.

SETTING: A flat obsidian-black volcanic ridge in the Atacama desert of Chile, deep blue-hour twilight transitioning to night, the Milky Way galactic core visible from horizon to horizon, no light pollution, Magellanic clouds visible, vintage Celestron telescope on a tripod beside them, two enamel mugs steaming on the blanket, a thermos.

LIGHTING: Pure starlight as key, faint warm amber from a hand-warmer or candle below frame, deep cobalt and violet ambient, no synthetic light sources, real exposure of night sky.

STYLE: [Insert Master Style Block] — additionally, real astrophotography exposure, no fake stars, dual-native ISO 3200 character of digital cinema cameras at high ISO.

AUDIO: Cold high-altitude wind, faint mechanical tick of telescope mount, the woman's whisper "there it is" barely audible, the man's quiet exhale of a laugh, distant coyote far in the canyon below. No music.

MOOD: Awe, intimacy, smallness against the cosmos, shared wonder.

NEGATIVE PROMPT: text, watermark, fake stars, painted galaxy, oversaturated nebula, plastic skin, deformed hands, motion blur, low resolution, AI artifacts, uncanny valley, anime style.
```

### Transition out (4-second clip)
```
CAMERA: Drone rises straight up at moderate speed into the Milky Way, the galactic core blooming and washing the entire frame to a soft warm white over 3 seconds.
AUDIO: Wind fades, replaced by a soft rising tone, a single breath of synth that resolves into the click of an LED ring light powering on.
```

---

# SCENE 3 — DIGITAL & CONTENT (Influencers) — INCLUDES DIALOGUE

### Reference image prompt (generate first)
```
A Black-Caribbean woman in her mid 20s with a high ponytail, oversized streetwear in cream and rust, paired with a Korean man in his late 20s in baggy charcoal streetwear and a chunky chain, mid-dance in a rain-slick Seoul alley at night, neon Hangul signage in pink, cyan, and electric blue reflecting off wet asphalt, an iPhone mounted on a Manfrotto tripod with a small ring light visible, photorealistic, anamorphic 2.39:1, saturated magenta-cyan color grade with naturalistic skin tones.
```

### Veo 3.1 video prompt (12 seconds — long form for the dialogue beat)
```
CAMERA: Low-altitude cinematic drone push-in starting at ankle height, rising to chest height while orbiting clockwise around the subjects. Smooth gimbal stabilization, 25mm anamorphic equivalent, T2. At second 8, switch to a 60fps slow-motion beat for the spin. Dolly back at the end.

SUBJECT: A Black-Caribbean woman in her mid 20s with a high sleek ponytail, oversized cream-colored hoodie and rust cargo pants, gold hoops; and a Korean man in his late 20s with a faded mullet and chunky silver chain, baggy charcoal streetwear, white sneakers. Both in their early career as content creators, comfortable in front of cameras.

ACTION: The pair are mid-choreography in a rain-slick Seoul alley. They hit a synced pose on beat, glance at each other, crack up laughing, reset and start the spin. As the orbit completes around second 8, the man stops dancing, turns directly to the drone camera, smiles warmly, and says with casual confidence: "Mitype was built with creators in mind." He shrugs, the woman laughs and pulls him back into the dance. They spin once more in slow motion as the drone pulls back.

SETTING: A vibrant rain-slick alley in Seoul at night, neon Hangul signage in saturated pink, cyan, and electric blue reflecting in puddles on the wet asphalt. An iPhone mounted on a Manfrotto Pixi tripod with a small Aputure ring light recording them. Steam rises from a manhole cover in the background. Hanging restaurant lanterns above.

LIGHTING: Practical neon as key (magenta and cyan), kicker from the ring light, fill from wet pavement bounce. Volumetric atmospheric haze catches every neon source.

STYLE: [Insert Master Style Block] — additionally, saturated magenta-cyan duotone treatment with full naturalistic skin tone retention, cyberpunk-meets-real-life aesthetic.

AUDIO: Light rain on pavement, distant Seoul city ambience, a muffled K-pop track playing from the tripod-mounted phone, both subjects' real laughter, the man's spoken line: "Mitype was built with creators in mind" — clearly enunciated, warm tone, perfect lip sync. A single rim-shot snare hit punctuating the line.

DIALOGUE (lip-synced): "Mitype was built with creators in mind."

MOOD: Joyful, kinetic, contemporary, real.

NEGATIVE PROMPT: text on screen, watermark, garbled speech, lip sync drift, distorted face, deformed hands, extra fingers, plastic skin, blurry features, AI artifacts, robotic dance, stiff motion, uncanny valley, anime, cartoon.
```

### Transition out (4-second clip)
```
CAMERA: Drone climbs above the alley and rotates 90 degrees to fly over the Seoul skyline. Lateral pan over neon cityscape, then a slow dissolve as a single warm copper pendant light grows in the center of the frame.
AUDIO: Neon city wash fades, replaced by the low hum of restaurant kitchen ventilation and the soft hiss of a gas burner.
```

---

# SCENE 4 — FOOD & LIFESTYLE (Chefs)

### Reference image prompt (generate first)
```
A Mexican woman chef in her 30s with hair pulled back in a low bun and a crisp navy apron over a fitted white tee, working across a polished steel pass from a Punjabi-Indian man chef in his late 20s with a short beard and sleeve tattoos, also in a navy apron. She is plating a dish of tuna crudo with tweezers, micro-greens and yellow yuzu gel; he is hand-torching the tuna surface with a controlled blue flame. Copper pendant lights overhead, exposed brick wall behind, hanging dried herbs, photorealistic Caravaggio chiaroscuro lighting, anamorphic 2.39:1, warm cognac color grade.
```

### Veo 3.1 video prompt (10 seconds)
```
CAMERA: Drone descends through a skylight from above into the kitchen, transitioning to a low-angle slow lateral dolly across the steel pass, then a fluid tilt up to catch the chefs' faces lit by flame, finally arcing up to a 90-degree overhead God's-eye view of the finished plate. Cooke 50mm anamorphic equivalent, T2.3. The torch flame beat in 60fps slow-motion.

SUBJECT: A Mexican woman chef in her 30s, hair in a low bun, navy apron over white tee, calm and precise; and a Punjabi-Indian man chef in his late 20s with a short well-groomed beard, forearm tattoos, also in a navy apron. Both with the relaxed body language of professionals at the top of their craft.

ACTION: She finishes a plate of tuna crudo with tweezers, placing micro-greens with surgical precision and dotting yuzu gel. He picks up a small culinary torch and runs a controlled blue flame across the surface of the tuna, the protein searing visibly, fat rendering. They look up at each other across the pass, share a single wordless nod of mutual respect, and slide the plate forward together with both hands.

SETTING: A moody, intimate chef's kitchen pass — exposed red brick walls, hanging dried sage and rosemary, polished stainless steel surfaces, copper pendant lights at low intensity, a single lit beeswax candle off to the side, vintage analog timer ticking on the wall.

LIGHTING: Practical copper pendants and the live torch flame as primary sources, deep Caravaggio chiaroscuro shadows, warm tungsten 2800K throughout, no synthetic fill.

STYLE: [Insert Master Style Block] — additionally, deep cognac warmth, crushed but legible shadows, food saturated to commercial-grade plating shot quality.

AUDIO: The hiss of the culinary torch, the quiet clink of tweezers on porcelain, faint jazz vinyl crackling from a record player off-frame (Bill Evans-style piano), the hum of the kitchen vent, no dialogue.

MOOD: Mutual respect, mastery, quiet ceremony, earned partnership.

NEGATIVE PROMPT: text, watermark, deformed hands, extra fingers, fake CGI flame, plastic-looking food, oversaturated, deformed faces, AI artifacts, motion stutter, low resolution, uncanny valley.
```

### Transition out (4-second clip)
```
CAMERA: Drone follows steam rising from the finished plate straight up through the skylight, the steam dissolving into low-hanging clouds drifting across a city skyline at deep magic hour.
AUDIO: Kitchen ambience fades, replaced by distant traffic horns far below and the first chord of an acoustic guitar.
```

---

# SCENE 5 — MUSIC (Musicians)

### Reference image prompt (generate first)
```
A Pacific Islander woman in her late 20s with long wavy dark hair and a vintage cream Gibson J-45 acoustic guitar, sitting on an overturned milk crate, beside an Iranian-American man in his early 30s with a styled beard and a handheld dynamic microphone on a cable, on a Brooklyn rooftop at deep magic hour, Manhattan skyline rake-lit on the horizon, sky gradient burnt orange to violet to ultramarine, warm Edison string lights crisscrossed overhead just turning on, two glasses of natural orange wine on a low concrete ledge, photorealistic, anamorphic 2.39:1, A24 indie cinema aesthetic.
```

### Veo 3.1 video prompt (10 seconds)
```
CAMERA: Cinematic drone emerges from low clouds and descends toward the rooftop, transitions into a slow 360-degree clockwise orbit around the subjects at chest height, lens grabbing flares from the Edison bulbs and the last sun, then pulls back and rises to reveal the full rooftop, the block, and finally the Brooklyn-to-Manhattan skyline. Cooke 40mm anamorphic equivalent, T2.

SUBJECT: A Pacific Islander woman in her late 20s with long wavy dark hair, simple black tank and high-waisted jeans, vintage cream Gibson J-45 acoustic guitar across her lap; and an Iranian-American man in his early 30s with a neatly styled dark beard, white linen shirt unbuttoned at the collar, handheld dynamic microphone on a coiled cable. Both barefoot on the rooftop deck.

ACTION: She strums a slow, fingerpicked progression on the J-45. He sings into the microphone with eyes closed, raw and unprocessed, his free hand resting gently on her shoulder. The string of Edison bulbs above them flickers on in unison at the second 4 mark. She glances up and smiles. He keeps singing. The skyline behind them lights up window by window like a parallel constellation.

SETTING: A Brooklyn rooftop deck at deep magic hour. The Manhattan skyline rakes the horizon. Sky gradient burnt orange at the horizon, deepening through violet to ultramarine overhead. A string of warm Edison bulbs crisscrosses above them. Two glasses of natural orange wine on a low concrete ledge. A potted fig tree in the corner. The rooftop is intimate, lived-in.

LIGHTING: Practical Edison string lights as warm key (2400K), the dying sun as massive natural fill from camera-left, deep ultramarine skywash from above as ambient. Real magic hour exposure.

STYLE: [Insert Master Style Block] — additionally, A24 indie cinema warmth, amber and magenta and indigo gradient sky, glowing intimate atmosphere.

AUDIO: A live unprocessed Gibson J-45 acoustic guitar fingerpicked progression in D major, a raw unprocessed male vocal humming a wordless melody, distant traffic horns far below, soft wind through the strings of the guitar, the audible click of Edison bulbs powering on at second 4. No production polish — feels live and real.

MOOD: Intimate, soulful, alive, the city as audience.

NEGATIVE PROMPT: text, watermark, autotuned vocal, synthetic music, deformed hands on guitar fretboard, extra fingers, plastic skin, fake sky, oversaturated sunset, AI artifacts, blurry, low resolution, uncanny valley.
```

### Transition out (4-second clip)
```
CAMERA: Drone continues climbing until the rooftop becomes one of thousands of lit windows. Each window across the skyline glows brighter in rhythm, blooming into a wash of soft warm white.
AUDIO: Guitar holds a final sustained chord that swells into a single piano note, fading to silence.
```

---

# END CARD — BRAND RESOLVE
*(Generate the background plate in Veo 3.1, then composite the text in After Effects or Resolve — Veo still struggles with crisp typography at brand quality)*

### Veo 3.1 background plate prompt (8 seconds, no text)
```
CAMERA: Static locked-off shot, no movement.
SUBJECT: Empty frame.
SETTING: A clean, soft, off-white background with a subtle warm vignette around the edges, faint film grain texture, almost imperceptible particle dust motes drifting slowly across the frame, very subtle anamorphic shimmer in the upper third of the frame as if from an off-screen lens flare.
LIGHTING: Soft, even, warm 3200K ambient.
STYLE: [Insert Master Style Block] — minimal, brand-quality negative space.
AUDIO: A single sustained warm piano note in C major, decaying slowly to silence over 8 seconds. Atmospheric vinyl crackle.
NEGATIVE PROMPT: text, letters, words, watermark, logo, busy texture, harsh shadows.
```

### Compositing in post (After Effects / DaVinci Resolve / Final Cut)
- **Card 1 (0:00–0:03):** Mitype wordmark in the brand amber `#c8956c`, custom serif, fade up over 0.5 seconds. Below in cap-spaced sans-serif: "FIND YOUR TYPE OF PEOPLE."
- **Card 2 (0:03–0:06):** Crossfade. Text: "FREE FOR THE FIRST MONTH." Below: "FIRST 50,000 USERS."
- **Card 3 (0:06–0:08):** Crossfade. Just the wordmark and below it: "mitypeapp.com"
- Fade to cream-white at 0:08.

---

## VEO 3.1 GENERATION ORDER (recommended workflow)

1. **Generate all 5 reference stills** in Veo 3.1 image mode (or Imagen 4) using the reference image prompts. Approve and save each.
2. **Generate Scene 3 first** — it has the dialogue and will be your hardest. Iterate the prompt until the lip sync and tone of "Mitype was built with creators in mind" are perfect. This is your benchmark for what's achievable.
3. **Generate Scenes 1, 2, 4, 5** using the locked reference stills for character consistency.
4. **Generate the 4 transition clips** as separate generations — these are pure connective tissue.
5. **Generate the end-card background plate** (no text — text gets composited).
6. **Assemble in your NLE** (Premiere / Resolve / Final Cut) at 24fps, 4K UHD, 2.39:1 cinemascope.
7. **Layer Artlist music score** underneath the entire piece (use the brief from the original prompt doc — Bon Iver meets Hans Zimmer, slow build, 70–80 bpm, key of D).
8. **Mix audio in 5.1 surround** + stereo fold-down at -23 LUFS for broadcast safety.
9. **HDR Dolby Vision master** + Rec. 709 SDR trim for web delivery.

---

## VEO 3.1 PRO TIPS FOR THIS COMMERCIAL

- **Use the exact word "cinematic"** in every prompt — Veo 3.1 weights it strongly toward film-look output.
- **Specify the lens make and focal length** ("Cooke S7/i 40mm anamorphic") even though Veo doesn't literally simulate the lens. It biases toward that aesthetic.
- **Audio direction is prose-friendly.** Describe sounds as a sound designer would, not as a list. "Wind across the cliff face, a single distant raven call" reads better than "wind, raven."
- **Lip sync requires the dialogue to be inside quotes** in the prompt and labeled as `DIALOGUE (lip-synced)`. Veo's quality tier is dramatically better at lip sync than the fast tier.
- **Reference images lock character likeness** but Veo still drifts on extended actions. If you need the same two climbers across a wide and a close-up, generate both in a single clip if possible, rather than two separate clips.
- **Negative prompts matter.** The full negative prompt block above is calibrated to the most common failure modes for human commercial work.
- **Cost estimate at Veo 3.1 Quality tier:** roughly $0.40–$0.75 per second of generated video. For 5 scenes × 10 seconds + 4 transitions × 4 seconds + 1 end card × 8 seconds = ~74 seconds of finals. Budget 3–5x that for iterations and retries. Total realistic budget: **$150–$300 in Veo credits** for a commercial-grade finished piece.

---

## ONE-PARAGRAPH "MAGIC PROMPT" VERSION
*(if you want to test a single all-in-one generation first)*

```
Cinematic 4K commercial for Mitype, ARRI Alexa 35 with Cooke anamorphic primes, 2.39:1, 24fps with 60fps slow-mo inserts, HDR Dolby Vision teal-and-amber grade, A24 meets Apple aesthetic. Five vignettes of two people each, every pair from a different cultural background, connected by smooth aerial drone transitions — ascending through clouds, orbiting subjects, descending through skylights — so the film reads as one continuous breath. Scene 1: Black woman and Filipino man rock-climbing a Moab sandstone cliff at golden-hour sunrise, she pulls him to the summit, drone orbits 270 degrees, ambient wind and raven, no dialogue. Scene 2: Brazilian-Indigenous woman and Lebanese man stargazing in the Atacama desert under a visible Milky Way, drone tracks past and rises to reveal galaxy, whispered "there it is," cold wind. Scene 3: Black-Caribbean woman and Korean man dancing choreographed in a neon-soaked rain-slick Seoul alley with their phone on a tripod, the man turns to camera mid-laugh and says with perfect lip sync "Mitype was built with creators in mind," drone orbits in 60fps slow motion. Scene 4: Mexican woman chef and Punjabi-Indian man chef plating a torched tuna crudo together in a copper-lit kitchen, Caravaggio practical flame lighting, drone arcs to top-down God's-eye on the finished plate, hiss of torch and clink of tweezers. Scene 5: Pacific Islander woman with vintage Gibson acoustic and Iranian-American man singing on a Brooklyn rooftop at magic hour with Manhattan skyline behind, Edison bulbs flickering on, drone orbits 360 degrees then rises to reveal the city, raw unprocessed acoustic guitar and vocal. End card: clean cream background, Mitype amber wordmark with "Find your type of people," then "Free for the first month — first 50,000 users," then "mitypeapp.com," single sustained piano note. Photorealistic humans, perfect anatomy and hands, full native audio generation including dialogue with perfect lip sync. Negative: text overlays in scenes, watermarks, deformed hands, extra fingers, plastic skin, garbled speech, lip sync drift, AI artifacts, uncanny valley, anime, cartoon.
```
