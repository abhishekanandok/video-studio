# Landing clips: exact prompts

Twelve 8-second clips for the One studio section. Each one starts from the photo already on the site, so the video
matches what people see before it loads.

**How to make each clip**
- Tool: Veo 3.1 (or Veo 3.1 Fast for clips without speech), **image-to-video**, 8 seconds, 1080p.
- First frame: the image named under each clip, from `frontend/public/landing/`.
- Audio: only `record` and `avatar` need speech (for lip sync). Every clip plays muted on the site.
- Every prompt ends with the same guard line, so keep it: *"No text, no captions, no logos, no watermark. Keep the
  people, clothes and place exactly as in the image."*

**How to hand them over**
Send the files with these exact names (or drop them into `frontend/public/landing/clips/`). I add each name to `CLIPS`
in `components/landing/platform.tsx` and the card starts playing it.

| File | Card | Aspect | First frame |
|---|---|---|---|
| `record.mp4` | You record | 9:16 | `creator.jpg` |
| `avatar.mp4` | AI avatar | 9:16 | `avatar-3d.jpg` |
| `review-1.mp4` … `review-6.mp4` | Review grid | 16:9 | `c-chai`, `c-qr`, `c-vendor`, `c-city`, `c-pin`, `c-rooftop` |
| `publish.mp4` | Publish, the main video | 16:9 | `c-chai.jpg` |
| `short-1.mp4` … `short-3.mp4` | Publish, the three Shorts | 9:16 | `docs/landing/first-frames/short-1…3.jpg` (vertical crops) |

---

## 1. `record.mp4` (You record) · 9:16 · first frame `creator.jpg` · WITH speech

> The woman is recording her YouTube video. She talks straight into the camera, relaxed and confident, with accurate
> lip sync, natural blinking, small head movements and one easy open-hand gesture. She speaks in Hinglish, in a warm,
> upbeat young Indian female voice, at a calm pace with a short pause between lines:
> "Ek chai ke dus rupaye. Aapne QR scan kiya, aur paisa pahunch gaya. Par beech mein hua kya?"
> Static locked-off camera, no cuts, no zoom. The green neon light and the lamp behind her glow softly. Quiet room tone,
> no music. No text, no captions, no logos, no watermark. Keep the people, clothes and place exactly as in the image.

The card's teleprompter shows these four lines. Once the clip arrives I time the teleprompter to her voice.

## 2. `avatar.mp4` (AI avatar) · 9:16 · first frame `avatar-3d.jpg` · WITH speech

> A 3D animated character in Pixar style. The young man looks into the camera, smiles and talks with accurate lip sync,
> bouncy and friendly, his fluffy hair moving slightly. He gives a quick thumbs up, then taps the laptop on his knee. He
> says in Hinglish, in a cheerful young Indian male voice: "Script do, video main bana deta hoon."
> Smooth Pixar-quality animation, soft studio light, static camera, the plain light background stays the same. Keep the
> lime hoodie and the word "Drishyya" on his t-shirt exactly as in the image. No other text, no captions, no logos, no
> watermark.

## 3. `review-1.mp4` · 16:9 · first frame `c-chai.jpg`

> Golden-hour street life at a busy roadside chai stall in an Indian city. The vendor pours chai from a kettle into
> glasses and steam rises. The woman in the yellow kurta holds up her phone to pay and smiles. Customers sip, a motorbike
> passes in the background, warm dust in the sunlight. Slow, smooth handheld push-in toward the woman. Natural motion,
> real-time speed. No text, no captions, no logos, no watermark. Keep the people, clothes and place exactly as in the
> image.

## 4. `review-2.mp4` · 16:9 · first frame `c-qr.jpg`

> Macro close-up. The hand steadies the phone over the QR code taped to the chai-stall counter. The camera app locks
> onto the code, the phone gives a tiny confident movement as it scans, and the screen glows brighter. The warm bokeh
> lights in the background twinkle and people pass softly out of focus. Very slow rack focus from the QR code to the
> phone screen. No readable text on the screen, no captions, no logos, no watermark. Keep the hand, phone and counter
> exactly as in the image.

## 5. `review-3.mp4` · 16:9 · first frame `c-vendor.jpg`

> Evening at a street-food market. The young vendor looks down at his phone, it lights up with a payment notification,
> and his face breaks into a proud, happy smile. He looks up and nods to a customer off-screen. Behind him steam rises
> from the pans, string lights glow and the crowd moves in soft focus. Slow dolly-in on his face. No readable text, no
> captions, no logos, no watermark. Keep the person, clothes and stall exactly as in the image.

## 6. `review-4.mp4` · 16:9 · first frame `c-city.jpg`

> Aerial night shot over Mumbai. Streams of car headlights and taillights flow along the curving coastal road and
> through the city like light moving through veins. Building windows flicker, gentle waves roll along the shore. Slow,
> smooth drone glide forward and slightly down. Cinematic, calm, a feeling of money and data moving across the city. No
> text, no captions, no logos, no watermark. Keep the city layout exactly as in the image.

## 7. `review-5.mp4` · 16:9 · first frame `c-pin.jpg`

> Over-the-shoulder close-up in a dark, cosy room. The person's thumb taps four digits on the glowing PIN keypad on the
> phone screen, each tap lighting a dot, and then the lock icon turns into a soft green tick. The warm lamp bokeh behind
> breathes gently. Very slow push-in toward the screen. The screen faces the person and the camera the whole time. No
> readable numbers, no captions, no logos, no watermark. Keep the hands, phone and room exactly as in the image.

## 8. `review-6.mp4` · 16:9 · first frame `c-rooftop.jpg`

> Sunset at a rooftop café. The group of friends laugh together. The man with the phone shows the screen to the others
> as the bill is split, someone raises a glass, the woman in yellow throws her head back laughing. Warm golden light,
> the city skyline glows and the clouds drift. Slow, gentle orbit around the table. No readable text, no captions, no
> logos, no watermark. Keep the people, clothes and place exactly as in the image.

## 9. `publish.mp4` (the finished video) · 16:9 · first frame `c-chai.jpg`

> The opening shot of a polished YouTube documentary. Golden-hour chai stall in an Indian city: steam rises from the
> glasses, the woman in the yellow kurta pays with her phone, the vendor smiles, a motorbike crosses frame. Smooth
> cinematic crane move rising slowly from the counter to reveal the busy street. Rich, warm, film-like colour grade,
> confident and premium. No text, no captions, no logos, no watermark. Keep the people, clothes and place exactly as in
> the image.

## 10. `short-1.mp4` · 9:16 · first frame `docs/landing/first-frames/short-1.jpg`

> Vertical Short. Tight on the young street-food vendor: his phone lights up with a payment, he grins and gives a quick
> thumbs up to the camera. String lights and steam behind him. Fast, punchy handheld push-in, energetic like a Reel. No
> readable text, no captions, no logos, no watermark. Keep the person and stall exactly as in the image.

## 11. `short-2.mp4` · 9:16 · first frame `docs/landing/first-frames/short-2.jpg`

> Vertical Short. Close-up of a hand scanning the QR code on the chai-stall counter with a phone. A quick, satisfying
> snap-zoom onto the phone as the scan completes and the screen glows. Warm bokeh lights. Punchy, social-media pace. No
> readable text, no captions, no logos, no watermark. Keep the hand, phone and counter exactly as in the image.

## 12. `short-3.mp4` · 9:16 · first frame `docs/landing/first-frames/short-3.jpg`

> Vertical Short. Friends at a rooftop café at sunset burst out laughing. One of them turns the phone to the camera
> after splitting the bill and grins. Golden light, city skyline behind. Lively handheld move, fun and warm, like an
> Instagram Reel. No readable text, no captions, no logos, no watermark. Keep the people and place exactly as in the
> image.
