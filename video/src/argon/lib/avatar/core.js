// Stick-man drawing engine (plain JavaScript, no React) - used by the video renderer AND by the
// Poses tab in the app, so what you see while editing is exactly what ends up in the video.
//
// drawAvatar({...}) returns SVG markup for viewBox "-60 -40 320 470" (feet stand at y = 392).
// Poses, moves and avatars come from stickman.json.

export const REST = {l_arm: [-14, 10], r_arm: [14, -10], l_leg: [-6, 0], r_leg: [6, 0], body: 0, head: 0, y: 0};
const LIMBS = ['l_arm', 'r_arm', 'l_leg', 'r_leg'];
const SCALARS = ['body', 'head', 'y'];
export const VIEWBOX = '-60 -40 320 470';

const rad = (d) => (d * Math.PI) / 180;
const dir = (deg, len) => [Math.sin(rad(deg)) * len, Math.cos(rad(deg)) * len];
const f = (n) => Math.round(n * 10) / 10;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const add = (p, v) => [p[0] + v[0], p[1] + v[1]];

// ---------------------------------------------------------------- poses & moves

const mix = (a, b, t) => {
	const out = {...a};
	for (const k of LIMBS) out[k] = [lerp(a[k][0], b[k][0], t), lerp(a[k][1], b[k][1], t)];
	for (const k of SCALARS) out[k] = lerp(a[k] || 0, b[k] || 0, t);
	return out;
};

// fluid = a smooth curve through the keys (Catmull-Rom): the joint keeps moving through a key instead of
// stopping at every key, like a real arm or leg (used by the body styles)
const keyValue = (keys, joint, phase, dur, fluid = false) => {
	const ks = keys.filter((k) => k[joint] !== undefined).sort((a, b) => a.t - b.t);
	if (!ks.length) return undefined;
	if (ks.length === 1) return ks[0][joint];
	let i = ks.length - 1;
	for (let j = 0; j < ks.length; j++) if (ks[j].t <= phase) i = j;
	const a = ks[i];
	const b = ks[(i + 1) % ks.length];
	let t0 = a.t;
	let t1 = b.t <= a.t ? b.t + dur : b.t;
	let p = phase < t0 ? phase + dur : phase;
	const u = Math.max(0, Math.min(1, (p - t0) / Math.max(1e-6, t1 - t0)));
	if (fluid && ks.length > 2) {
		const n = ks.length;
		const v0 = ks[(i - 1 + n) % n][joint], v1 = a[joint], v2 = b[joint], v3 = ks[(i + 2) % n][joint];
		const cr = (p0, p1, p2, p3) => 0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (3 * p1 - p0 - 3 * p2 + p3) * u * u * u);
		if (Array.isArray(v1)) return [cr(v0[0], v1[0], v2[0], v3[0]), cr(v0[1], v1[1], v2[1], v3[1])];
		return cr(v0, v1, v2, v3);
	}
	const t = smooth(u);
	if (Array.isArray(a[joint])) return [lerp(a[joint][0], b[joint][0], t), lerp(a[joint][1], b[joint][1], t)];
	return lerp(a[joint], b[joint], t);
};

// joint angles + face for a pose or move at time t (seconds)
export const poseAt = (data, name, t = 0, fluid = false) => {
	const poses = data.poses || {};
	const moves = data.moves || {};
	if (poses[name]) return {...REST, ...poses[name], face: {...(poses[name].face || {})}};
	const m = moves[name];
	if (!m) return {...REST, ...(poses.stand || {}), face: {...((poses.stand || {}).face || {})}};
	const base = {...REST, ...(poses[m.base] || {})};
	const out = {...base, face: {...(base.face || {}), ...(m.face || {})}, prop: base.prop};
	for (const k of SCALARS) if (m[k] !== undefined) out[k] = m[k];
	const dur = m.duration || 1;
	const phase = m.loop === false ? Math.min(t, dur) : ((t % dur) + dur) % dur;
	for (const j of [...LIMBS, ...SCALARS]) {
		const v = keyValue(m.keys || [], j, phase, dur, fluid && m.loop !== false);
		if (v !== undefined) out[j] = v;
	}
	out.moving = true;
	return out;
};

// ---------------------------------------------------------------- face pieces (head-local, radius 48)

const EYES = {
	open: (ink, blink) => blink
		? `<path d="M-23,-6 L-9,-6 M9,-6 L23,-6" stroke="${ink}" stroke-width="4.5" stroke-linecap="round"/>`
		: `<ellipse cx="-16" cy="-6" rx="6.5" ry="8.5" fill="${ink}"/><ellipse cx="16" cy="-6" rx="6.5" ry="8.5" fill="${ink}"/>
		   <circle cx="-14" cy="-9" r="2.3" fill="#fff" opacity=".9"/><circle cx="18" cy="-9" r="2.3" fill="#fff" opacity=".9"/>`,
	wide: (ink) => `<circle cx="-16" cy="-7" r="10" fill="#fff" stroke="${ink}" stroke-width="3.5"/><circle cx="16" cy="-7" r="10" fill="#fff" stroke="${ink}" stroke-width="3.5"/>
		<circle cx="-16" cy="-6" r="4.5" fill="#111"/><circle cx="16" cy="-6" r="4.5" fill="#111"/>`,
	happy: (ink) => `<path d="M-24,-4 Q-16,-15 -8,-4 M8,-4 Q16,-15 24,-4" fill="none" stroke="${ink}" stroke-width="4.5" stroke-linecap="round"/>`,
	closed: (ink) => `<path d="M-24,-7 Q-16,0 -8,-7 M8,-7 Q16,0 24,-7" fill="none" stroke="${ink}" stroke-width="4.5" stroke-linecap="round"/>`,
	sleepy: (ink) => `<path d="M-24,-5 L-8,-5 M8,-5 L24,-5" stroke="${ink}" stroke-width="4.5" stroke-linecap="round"/>
		<path d="M-22,-5 Q-16,2 -10,-5 M10,-5 Q16,2 22,-5" fill="${ink}"/>`,
	angry: (ink) => `<ellipse cx="-16" cy="-4" rx="6" ry="6.5" fill="${ink}"/><ellipse cx="16" cy="-4" rx="6" ry="6.5" fill="${ink}"/>`,
	sad: (ink) => `<ellipse cx="-16" cy="-4" rx="5.5" ry="7" fill="${ink}"/><ellipse cx="16" cy="-4" rx="5.5" ry="7" fill="${ink}"/>
		<circle cx="-14" cy="-7" r="2" fill="#fff" opacity=".9"/><circle cx="18" cy="-7" r="2" fill="#fff" opacity=".9"/>`,
	wink: (ink) => `<ellipse cx="-16" cy="-6" rx="6.5" ry="8.5" fill="${ink}"/><path d="M8,-5 Q16,-13 24,-5" fill="none" stroke="${ink}" stroke-width="4.5" stroke-linecap="round"/>`,
};
const BROWS = {
	none: () => '',
	up: (ink) => `<path d="M-26,-24 Q-16,-31 -6,-25 M6,-25 Q16,-31 26,-24" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`,
	angry: (ink) => `<path d="M-26,-22 L-7,-14 M7,-14 L26,-22" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`,
	sad: (ink) => `<path d="M-25,-14 L-8,-22 M8,-22 L25,-14" stroke="${ink}" stroke-width="4.5" stroke-linecap="round"/>`,
	worried: (ink) => `<path d="M-25,-18 Q-16,-26 -7,-22 M7,-25 Q16,-29 25,-21" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`,
};
const MOUTHS = {
	smile: (ink) => `<path d="M-13,14 Q0,25 13,14" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`,
	grin: (ink) => `<path d="M-16,12 Q0,30 16,12" fill="none" stroke="${ink}" stroke-width="5.5" stroke-linecap="round"/>`,
	big: (ink) => `<path d="M-17,11 Q0,36 17,11 Z" fill="${ink}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><path d="M-9,24 Q0,30 9,24" fill="#E5383B" opacity=".9"/>`,
	flat: (ink) => `<path d="M-11,18 L11,18" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`,
	frown: (ink) => `<path d="M-13,22 Q0,11 13,22" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`,
	o: (ink) => `<ellipse cx="0" cy="19" rx="7" ry="9" fill="${ink}"/>`,
	smirk: (ink) => `<path d="M-12,18 Q4,22 14,11" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`,
	teeth: (ink) => `<rect x="-15" y="11" width="30" height="13" rx="4" fill="#fff" stroke="${ink}" stroke-width="3.5"/><path d="M-15,17.5 L15,17.5 M-5,11 L-5,24 M5,11 L5,24" stroke="${ink}" stroke-width="2"/>`,
	wavy: (ink) => `<path d="M-14,19 Q-7,13 0,19 Q7,25 14,19" fill="none" stroke="${ink}" stroke-width="4.5" stroke-linecap="round"/>`,
	talk: (ink, open) => `<ellipse cx="0" cy="17" rx="${f(9 + open * 2)}" ry="${f(2.5 + open * 8)}" fill="${ink}"/>`,
};

// the open eyes / smile of the body styles: small dot eyes, glossy eyes, or tall rubber-hose "pie" eyes
const STYLE_EYES = {
	dot: (ink) => `<ellipse cx="-15" cy="-5" rx="5.4" ry="6.8" fill="${ink}"/><ellipse cx="15" cy="-5" rx="5.4" ry="6.8" fill="${ink}"/>
		<circle cx="-13.3" cy="-7.6" r="1.9" fill="#fff"/><circle cx="16.7" cy="-7.6" r="1.9" fill="#fff"/>`,
	gloss: (ink) => `<ellipse cx="-16" cy="-6" rx="6.4" ry="8.4" fill="${ink}"/><ellipse cx="16" cy="-6" rx="6.4" ry="8.4" fill="${ink}"/>
		<ellipse cx="-14" cy="-9.5" rx="2.6" ry="3" fill="#fff"/><ellipse cx="18" cy="-9.5" rx="2.6" ry="3" fill="#fff"/>`,
	kino: (ink) => `<circle cx="8" cy="-6" r="6" fill="${ink}"/><circle cx="27" cy="-6" r="6" fill="${ink}"/>`,
	pie: (ink) => `<ellipse cx="-14" cy="-7" rx="6.6" ry="12.5" fill="${ink}"/><ellipse cx="14" cy="-7" rx="6.6" ry="12.5" fill="${ink}"/>
		<path d="M-15.5,-15 l3.4,-2.6 l1.2,6.6 Z M12.5,-15 l3.4,-2.6 l1.2,6.6 Z" fill="#fff"/>`,
};
const STYLE_BROWS = {
	pie: (ink) => `<path d="M-23,-27 Q-15,-33 -7,-28 M7,-28 Q15,-33 23,-27" fill="none" stroke="${ink}" stroke-width="3.2" stroke-linecap="round"/>`,
};
const STYLE_SMILE = {
	dot: (ink) => `<path d="M-11,13 Q0,22 11,13" fill="none" stroke="${ink}" stroke-width="4.4" stroke-linecap="round"/>`,
	gloss: (ink) => `<path d="M-12,14 Q0,23 12,14" fill="none" stroke="${ink}" stroke-width="4.6" stroke-linecap="round"/>`,
	kino: (ink) => `<path d="M6,17 Q18,27 30,17" fill="none" stroke="${ink}" stroke-width="5.5" stroke-linecap="round"/>`,
	pie: (ink) => `<path d="M-21,8 Q-2,31 21,9" fill="none" stroke="${ink}" stroke-width="4.4" stroke-linecap="round"/><path d="M-24,4 Q-22,9 -19,11 M24,5 Q22,10 19,12" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"/>`,
};

// ---------------------------------------------------------------- clothing & accessories

// head-local (centre 0,0, radius 48)
const HEAD_BACK = {
	bun: (c) => `<circle cx="-36" cy="-33.6" r="18.2" fill="${c.hairInk}"/>`,
	hood: (c) => `<path d="M-64,44 A64,66 0 1 1 64,44 Z" fill="${c.acc}"/><path d="M-64,44 A64,66 0 1 1 64,44" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="4"/>`,
	ponytail: (c) => `<path d="M34,-26 Q${f(82 + c.sw * 6)},4 ${f(62 + c.sw * 10)},72" fill="none" stroke="${c.ink}" stroke-width="17" stroke-linecap="round"/>`,
	long_hair: (c) => `<path d="M-56,-2 Q-60,-62 0,-60 Q60,-62 56,-2 L60,70 Q44,58 38,24 L-38,24 Q-44,58 -60,70 Z" fill="${c.ink}"/>`,
	// a cloth over the head falling to the shoulders (village woman's dupatta / saree pallu, nomad's head wrap)
	veil: (c) => `<path d="M-60,40 Q-66,-62 0,-66 Q66,-62 60,40 L70,96 Q40,80 40,30 L-40,30 Q-40,80 -70,96 Z" fill="${c.kHat}" stroke="${c.ink}" stroke-width="3.5" stroke-linejoin="round"/>
		<path d="M-58,-20 Q0,-50 58,-20" fill="none" stroke="${c.band}" stroke-width="5"/>`,
	pointed_hood: (c) => `<path d="M-60,40 Q-70,-40 -10,-70 Q14,-110 40,-104 Q30,-80 52,-40 Q66,0 60,40 Z" fill="${c.kHat}" stroke="${c.ink}" stroke-width="3.5" stroke-linejoin="round"/>`,
	fur_hood: (c) => `<path d="M-64,42 A64,68 0 1 1 64,42 Z" fill="${c.kHat}" stroke="${c.ink}" stroke-width="3.5"/>
		<path d="M-56,30 A56,58 0 1 1 56,30" fill="none" stroke="#F4F1EA" stroke-width="14" stroke-dasharray="6 5" stroke-linecap="round"/>`,
};
const HEAD_FRONT = {
	cap: (c) => `<path d="M-49,-8 A49,49 0 0 1 49,-8 Z" fill="${c.acc}"/><path d="M38,-10 L92,-3" stroke="${c.acc}" stroke-width="12" stroke-linecap="round"/><circle cx="0" cy="-50" r="5" fill="${c.acc}"/>`,
	flatcap: (c) => `<path d="M-54,-24 Q0,-70 54,-24 L60,-16 L-58,-16 Z" fill="${c.acc}"/><path d="M-58,-16 L60,-16" stroke="rgba(0,0,0,.25)" stroke-width="4"/>`,
	glasses: (c) => `<g fill="none" stroke="${c.ink}" stroke-width="4"${c.faceDx ? ` transform="translate(${c.faceDx} 0) scale(.82)"` : ''}><circle cx="-16" cy="-6" r="14"/><circle cx="16" cy="-6" r="14"/><path d="M-2,-7 Q0,-10 2,-7 M-30,-8 L-47,-12 M30,-8 L47,-12"/></g>`,
	beard: () => `<path d="M-34,6 Q-32,60 0,66 Q32,60 34,6 Q20,26 0,27 Q-20,26 -34,6 Z" fill="#E3DED5" stroke="rgba(0,0,0,.15)" stroke-width="2"/>`,
	mustache: (c) => `<path d="M-17,11 Q-8,4 0,9 Q8,4 17,11 Q8,10 0,13 Q-8,10 -17,11 Z" fill="${c.ink}"/>`,
	side_part: (c) => `<path d="M-46,-10 Q-42,-60 10,-52 Q44,-46 46,-10 Q22,-36 -16,-32 Q-30,-30 -46,-10 Z" fill="${c.ink}"/>`,
	tufts: (c) => `<path d="M-48,-4 Q-60,-26 -40,-36 M48,-4 Q60,-26 40,-36" fill="none" stroke="${c.ink}" stroke-width="8" stroke-linecap="round"/>`,
	spiky_hair: (c) => `<path d="M-44,-18 L-40,-52 L-24,-40 L-14,-66 L0,-46 L14,-68 L24,-42 L40,-56 L44,-18 Q0,-36 -44,-18 Z" fill="${c.ink}"/>`,
	bow: (c) => `<path d="M24,-46 l18,-14 l3,22 Z M24,-46 l-8,-20 l-15,16 Z" fill="${c.acc}"/><circle cx="24" cy="-46" r="5" fill="${c.acc}"/>`,
	headphones: (c) => `<path d="M-52,2 A52,54 0 0 1 52,2" fill="none" stroke="${c.acc}" stroke-width="9" stroke-linecap="round"/><rect x="-62" y="-12" width="18" height="32" rx="7" fill="${c.acc}"/><rect x="44" y="-12" width="18" height="32" rx="7" fill="${c.acc}"/>`,
	headband: (c) => `<path d="M-48,-22 Q0,-38 48,-22" fill="none" stroke="${c.acc}" stroke-width="10"/><path d="M-44,-24 L-62,-10 M-44,-24 L-60,-30" stroke="${c.acc}" stroke-width="7" stroke-linecap="round"/>`,
	helmet: (c) => `<path d="M-6,-50 Q${f(-30 + c.sw * 3)},-112 ${f(-74 + c.sw * 4)},-66 Q-52,-82 -30,-60 Q-18,-58 -6,-50 Z" fill="${c.crest}" stroke="rgba(0,0,0,.35)" stroke-width="2.5"/>
		<path d="M-52,-6 Q-56,-58 0,-60 Q56,-58 52,-6 L46,-6 L44,-22 L-44,-22 L-46,-6 Z" fill="${c.metal}" stroke="${c.ink}" stroke-width="3.5" stroke-linejoin="round"/>
		<path d="M-48,-22 L48,-22" stroke="${c.metalDark}" stroke-width="6"/><path d="M-44,-20 L-40,26 L-26,30 L-28,-2 Z M44,-20 L40,26 L26,30 L28,-2 Z" fill="${c.metal}" stroke="${c.ink}" stroke-width="3" stroke-linejoin="round"/>
		<ellipse cx="-14" cy="-44" rx="9" ry="5" fill="#fff" opacity=".35"/>`,
	explorer_hat: (c) => `<ellipse cx="0" cy="-30" rx="70" ry="14" fill="${c.hat}" stroke="${c.ink}" stroke-width="3.5"/>
		<path d="M-40,-32 Q-44,-86 0,-86 Q44,-86 40,-32 Z" fill="${c.hat}" stroke="${c.ink}" stroke-width="3.5" stroke-linejoin="round"/>
		<path d="M-41,-42 Q0,-32 41,-42 L40,-32 Q0,-24 -40,-32 Z" fill="${c.hatBand}"/><path d="M-16,-80 Q0,-70 16,-80" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="3"/>`,
	straw_hat: (c) => `<ellipse cx="0" cy="-30" rx="84" ry="17" fill="${c.straw}" stroke="${c.ink}" stroke-width="3.5"/>
		<path d="M-40,-32 Q-42,-82 0,-84 Q42,-82 40,-32 Z" fill="${c.straw}" stroke="${c.ink}" stroke-width="3.5" stroke-linejoin="round"/>
		<path d="M-41,-40 Q0,-30 41,-40 L40,-30 Q0,-22 -40,-30 Z" fill="${c.band}"/>
		<path d="M-70,-30 Q-40,-22 -20,-24 M30,-24 Q52,-24 70,-32" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="2.5"/>`,
	// from Stickman Kino (MIT): hats in the hat colour (avatar 'hat', else the accent), outlined in ink
	beanie: (c) => `<g transform="translate(0 -9)"><path d="M-50.9,-5.8 A50.9,50.9 0 0 1 50.9,-5.8 Z" fill="${c.kHat}" stroke="${c.ink}" stroke-width="4" stroke-linejoin="round"/><rect x="-53.8" y="-15.4" width="107.6" height="15.4" rx="5.8" fill="${c.kHat}" stroke="${c.ink}" stroke-width="4"/></g>`,
	hardhat: (c) => `<path d="M-45.6,-14.4 A47,48 0 0 1 45.6,-14.4 Z" fill="${c.kHat}" stroke="${c.ink}" stroke-width="4" stroke-linejoin="round"/><rect x="-64.8" y="-18.2" width="129.6" height="9.6" rx="4.8" fill="${c.kHat}" stroke="${c.ink}" stroke-width="4"/>`,
	tophat: (c) => `<rect x="-29.8" y="-98.4" width="59.5" height="62.4" rx="3.8" fill="${c.dark}" stroke="${c.ink}" stroke-width="4"/><rect x="-55.2" y="-40.8" width="110.4" height="9.6" rx="4.8" fill="${c.dark}" stroke="${c.ink}" stroke-width="4"/><rect x="-29" y="-50" width="58" height="9" fill="${c.kHat}"/>`,
	grad_cap: (c) => `<path d="M-67.2,-45.6 L0,-69.6 L67.2,-45.6 L0,-24 Z" fill="${c.dark}" stroke="${c.ink}" stroke-width="4" stroke-linejoin="round"/><path d="M43.2,-45.6 L52.8,-9.6" stroke="${c.kHat}" stroke-width="6" stroke-linecap="round"/>`,
	chef_hat: (c) => `<path d="M-33.6,-28.8 C-72,-57.6 -28.8,-105.6 0,-81.6 C28.8,-105.6 72,-57.6 33.6,-28.8 Z" fill="#FFFFFF" stroke="${c.ink}" stroke-width="4" stroke-linejoin="round"/>`,
	beret: (c) => `<ellipse cx="-4.8" cy="-38.4" rx="50.4" ry="18.2" fill="${c.kHat}" stroke="${c.ink}" stroke-width="4"/>`,
	party_hat: (c) => `<path d="M-26.4,-36 L4.8,-100.8 L28.8,-33.6 Z" fill="${c.kHat}" stroke="${c.ink}" stroke-width="4" stroke-linejoin="round"/><circle cx="4.8" cy="-103.2" r="9.6" fill="#3DBE4F"/>`,
	bob_hair: (c) => `<path d="M-50.4,14.4 A50.4,50.4 0 1 1 33.6,-36 Q0,-26.4 -21.6,16.8 Z" fill="${c.hairInk}"/>`,
	antenna: (c) => `<path d="M0,-48 L0,-74" stroke="${c.ink}" stroke-width="5" stroke-linecap="round"/><circle cx="0" cy="-79" r="8.6" fill="${c.kHat}"/>`,
	crown: () => `<path d="M-32,-40 L-38,-82 L-17,-60 L0,-90 L17,-60 L38,-82 L32,-40 Z" fill="#F2B33D" stroke="#B47F12" stroke-width="3" stroke-linejoin="round"/><circle cx="0" cy="-56" r="5" fill="#E5383B"/>`,
	blush: (c) => `<ellipse cx="-27" cy="10" rx="8" ry="5" fill="#FF7A8A" opacity=".45"/><ellipse cx="27" cy="10" rx="8" ry="5" fill="#FF7A8A" opacity=".45"/>`,
	// ---- the outfit sheet: hats and helmets in the hat colour (av.hat, else the accent), outlined in ink
	messy_hair: (c) => `<path d="M-47,-14 Q-56,-52 -26,-60 Q-18,-76 2,-66 Q22,-80 34,-60 Q58,-54 48,-12 Q40,-36 22,-38 Q4,-30 -14,-40 Q-34,-36 -47,-14 Z" fill="${c.hairInk}"/>`,
	cave_hair: (c) => `<path d="M-50,10 Q-64,-30 -44,-56 Q-30,-80 0,-74 Q34,-82 50,-54 Q66,-26 52,12 L46,-10 Q40,-34 20,-40 Q0,-30 -20,-42 Q-40,-34 -44,-8 Z" fill="#5B3A1E"/>`,
	turban: (c) => `<path d="M-52,-12 Q-60,-74 0,-80 Q60,-74 52,-12 Q0,-30 -52,-12 Z" fill="${c.kHat}" stroke="${c.ink}" stroke-width="3.5" stroke-linejoin="round"/>
		<path d="M-50,-30 Q0,-64 52,-38 M-46,-48 Q4,-74 48,-54 M-30,-20 Q10,-56 46,-24" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="4" stroke-linecap="round"/>
		<circle cx="0" cy="-48" r="7" fill="#E5383B" stroke="#B47F12" stroke-width="3"/>`,
	police_cap: (c) => `<path d="M-50,-22 Q-56,-62 0,-64 Q56,-62 50,-22 Z" fill="${c.kHat}" stroke="${c.ink}" stroke-width="3.5"/>
		<rect x="-50" y="-28" width="100" height="12" fill="#1B1B1F"/><path d="M-26,-16 Q20,-24 66,-8 Q30,-2 -26,-12 Z" fill="#1B1B1F"/>
		<path d="M0,-50 l5,9 l10,1 l-7,7 l2,10 l-10,-5 l-10,5 l2,-10 l-7,-7 l10,-1 Z" fill="#F2B33D" stroke="#8C6420" stroke-width="1.5"/>`,
	pilot_cap: (c) => `<path d="M-54,-24 Q-60,-66 0,-68 Q60,-66 54,-24 Z" fill="#FFFFFF" stroke="${c.ink}" stroke-width="3.5"/>
		<rect x="-52" y="-30" width="104" height="12" fill="#1B1B1F"/><path d="M-26,-18 Q20,-26 66,-10 Q30,-4 -26,-14 Z" fill="#1B1B1F"/>
		<path d="M-14,-46 Q0,-56 14,-46 Q0,-40 -14,-46 Z" fill="#F2B33D" stroke="#8C6420" stroke-width="1.5"/>`,
	pillbox: (c) => `<rect x="-30" y="-66" width="60" height="22" rx="6" fill="${c.kHat}" stroke="${c.ink}" stroke-width="3.5" transform="rotate(-8)"/>`,
	bucket_hat: (c) => `<path d="M-64,-24 Q-60,-30 -42,-34 Q-46,-80 0,-80 Q46,-80 42,-34 Q60,-30 64,-24 Q0,-14 -64,-24 Z" fill="${c.kHat}" stroke="${c.ink}" stroke-width="3.5" stroke-linejoin="round"/>
		<path d="M-42,-40 Q0,-30 42,-40" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="5"/>`,
	cowboy_hat: (c) => `<path d="M-86,-34 Q-70,-18 -40,-28 L40,-28 Q70,-18 86,-34 Q74,-14 40,-16 L-40,-16 Q-74,-14 -86,-34 Z" fill="${c.kHat}" stroke="${c.ink}" stroke-width="3.5" stroke-linejoin="round"/>
		<path d="M-38,-26 Q-44,-82 -14,-86 Q0,-74 14,-86 Q44,-82 38,-26 Z" fill="${c.kHat}" stroke="${c.ink}" stroke-width="3.5" stroke-linejoin="round"/>
		<path d="M-39,-36 Q0,-28 39,-36 L38,-28 Q0,-22 -38,-28 Z" fill="${c.hatBand}"/>`,
	tricorn: (c) => `<path d="M-74,-30 Q-60,-86 0,-84 Q60,-86 74,-30 Q40,-44 0,-40 Q-40,-44 -74,-30 Z" fill="#1B1B1F" stroke="${c.ink}" stroke-width="3.5" stroke-linejoin="round"/>
		<path d="M-70,-32 Q0,-52 70,-32" fill="none" stroke="#D9B45A" stroke-width="4"/>
		<g transform="translate(0 -62)"><circle r="9" fill="#F4F1EA"/><path d="M-12,8 L12,16 M12,8 L-12,16" stroke="#F4F1EA" stroke-width="3.5"/></g>`,
	viking_helmet: (c) => `<path d="M-50,-14 Q-54,-70 0,-72 Q54,-70 50,-14 Z" fill="#9AA3AD" stroke="${c.ink}" stroke-width="3.5"/>
		<path d="M-50,-20 L50,-20 M0,-72 L0,-20" stroke="#6B737D" stroke-width="7"/><path d="M-6,-20 L6,-20 L4,18 L-4,18 Z" fill="#9AA3AD" stroke="${c.ink}" stroke-width="2.5"/>
		<path d="M-46,-40 Q-84,-50 -86,-96 Q-66,-66 -42,-58 Z M46,-40 Q84,-50 86,-96 Q66,-66 42,-58 Z" fill="#F4ECD8" stroke="${c.ink}" stroke-width="3" stroke-linejoin="round"/>`,
	dark_beard: () => `<path d="M-36,4 Q-36,62 0,70 Q36,62 36,4 Q20,24 0,25 Q-20,24 -36,4 Z" fill="#4A3020" stroke="rgba(0,0,0,.25)" stroke-width="2"/><path d="M-16,10 Q-8,4 0,9 Q8,4 16,10" fill="none" stroke="#3A2414" stroke-width="7" stroke-linecap="round"/>`,
	viking_beard: () => `<path d="M-40,0 Q-42,70 0,82 Q42,70 40,0 Q22,24 0,24 Q-22,24 -40,0 Z" fill="#C2662B" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
		<path d="M-18,10 Q-8,4 0,9 Q8,4 18,10" fill="none" stroke="#A3501F" stroke-width="7" stroke-linecap="round"/>`,
	knight_helmet: (c) => `<path d="M-50,40 L-52,-24 Q-50,-66 0,-68 Q50,-66 52,-24 L50,40 Q0,52 -50,40 Z" fill="#B8C0C8" stroke="${c.ink}" stroke-width="3.5" stroke-linejoin="round"/>
		<path d="M-40,-6 L40,-6" stroke="#1B1B1F" stroke-width="8" stroke-linecap="round"/><path d="M0,0 L0,36 M-14,14 L-14,30 M14,14 L14,30" stroke="#6B737D" stroke-width="3.5"/>
		<path d="M-6,-68 Q-2,-104 18,-110 Q8,-84 10,-66 Z" fill="#C0262D" stroke="${c.ink}" stroke-width="2.5"/>`,
	samurai_helmet: (c) => `<path d="M-50,-16 Q-54,-68 0,-70 Q54,-68 50,-16 Z" fill="#2A2420" stroke="${c.ink}" stroke-width="3.5"/>
		<path d="M-52,-18 L-74,8 L-46,2 Z M52,-18 L74,8 L46,2 Z" fill="#B3261E" stroke="${c.ink}" stroke-width="3" stroke-linejoin="round"/>
		<path d="M-6,-58 Q-30,-96 -40,-110 Q-14,-90 0,-70 Q14,-90 40,-110 Q30,-96 6,-58 Z" fill="#D9B45A" stroke="#8C6420" stroke-width="2.5"/>
		<path d="M-50,-24 L50,-24" stroke="#B3261E" stroke-width="5"/>`,
	roman_helmet: (c) => `<path d="M-52,-8 Q-56,-62 0,-64 Q56,-62 52,-8 L44,-8 L42,-22 L-42,-22 L-44,-8 Z" fill="#B8C0C8" stroke="${c.ink}" stroke-width="3.5" stroke-linejoin="round"/>
		<path d="M-44,-20 L-42,24 L-28,26 L-30,-4 Z M44,-20 L42,24 L28,26 L30,-4 Z" fill="#B8C0C8" stroke="${c.ink}" stroke-width="3" stroke-linejoin="round"/>
		<path d="M-60,-62 Q0,-110 60,-62 Q0,-82 -60,-62 Z" fill="#C0262D" stroke="${c.ink}" stroke-width="2.5"/>`,
	ninja_mask: (c) => `<path fill-rule="evenodd" d="M-50,0 A50,50 0 1 1 50,0 A50,50 0 1 1 -50,0 Z M-38,-20 Q0,-30 38,-20 L36,2 Q0,-6 -36,2 Z" fill="#1B1B1F" stroke="${c.ink}" stroke-width="3"/>
		<path d="M44,-30 Q${f(70 + c.sw * 8)},-24 ${f(84 + c.sw * 10)},-6 M44,-22 Q${f(66 + c.sw * 8)},-10 ${f(74 + c.sw * 10)},8" fill="none" stroke="#1B1B1F" stroke-width="7" stroke-linecap="round"/>`,
	wizard_hat: (c) => `<ellipse cx="0" cy="-34" rx="74" ry="14" fill="${c.kHat}" stroke="${c.ink}" stroke-width="3.5"/>
		<path d="M-40,-36 Q-20,-80 6,-120 Q30,-136 44,-118 Q24,-114 22,-86 Q30,-60 40,-36 Z" fill="${c.kHat}" stroke="${c.ink}" stroke-width="3.5" stroke-linejoin="round"/>
		<path d="M-12,-66 l3,7 l7,1 l-5,5 l1,7 l-6,-3 l-6,3 l1,-7 l-5,-5 l7,-1 Z M14,-96 l2,5 l5,1 l-4,3 l1,5 l-4,-2 l-4,2 l1,-5 l-4,-3 l5,-1 Z" fill="#F2D16B"/>`,
	space_helmet: () => `<circle cx="0" cy="0" r="66" fill="rgba(200,230,255,.22)" stroke="#F4F6FA" stroke-width="9"/>
		<circle cx="0" cy="0" r="66" fill="none" stroke="#1B1B1F" stroke-width="2.5"/><path d="M-40,-36 Q-22,-54 6,-56" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".8"/>
		<rect x="-30" y="58" width="60" height="16" rx="6" fill="#C9CED6" stroke="#1B1B1F" stroke-width="2.5"/>`,
	fire_helmet: (c) => `<path d="M-70,-14 Q-58,-6 -48,-16 L48,-16 Q60,-6 70,-14 Q60,-28 50,-26 Q54,-70 0,-74 Q-54,-70 -50,-26 Q-60,-28 -70,-14 Z" fill="#C0262D" stroke="${c.ink}" stroke-width="3.5" stroke-linejoin="round"/>
		<path d="M0,-74 L0,-26" stroke="#8E1B1B" stroke-width="6"/><path d="M-14,-56 L14,-56 L12,-36 L0,-30 L-12,-36 Z" fill="#F2B33D" stroke="#8C6420" stroke-width="2"/>`,
	tiara: () => `<path d="M-34,-40 L-26,-66 L-14,-50 L0,-74 L14,-50 L26,-66 L34,-40 Q0,-50 -34,-40 Z" fill="#F2B33D" stroke="#B47F12" stroke-width="2.5" stroke-linejoin="round"/>
		<circle cx="0" cy="-58" r="5" fill="#E5383B"/><circle cx="-24" cy="-52" r="3.5" fill="#2E9D57"/><circle cx="24" cy="-52" r="3.5" fill="#2E9D57"/>`,
	keffiyeh: (c) => `<path d="M-56,-6 Q-60,-70 0,-72 Q60,-70 56,-6 Q40,-26 0,-28 Q-40,-26 -56,-6 Z" fill="${c.kHat}" stroke="${c.ink}" stroke-width="3.5"/>
		<path d="M-52,-40 Q0,-60 52,-40" fill="none" stroke="#1B1B1F" stroke-width="6"/><path d="M-56,-6 L-62,70 M56,-6 L62,70" stroke="${c.kHat}" stroke-width="18" stroke-linecap="round"/>`,
	bandana: (c) => `<path d="M-50,-14 Q-52,-58 0,-60 Q52,-58 50,-14 Q0,-34 -50,-14 Z" fill="${c.kHat}" stroke="${c.ink}" stroke-width="3.5"/>
		<path d="M48,-24 L70,-34 L66,-12 Z M48,-20 L66,-2 L46,-4 Z" fill="${c.kHat}" stroke="${c.ink}" stroke-width="2.5"/>
		<circle cx="-18" cy="-40" r="3" fill="#fff" opacity=".7"/><circle cx="14" cy="-44" r="3" fill="#fff" opacity=".7"/>`,
	goggles: (c) => `<path d="M-50,-24 Q0,-30 50,-24" fill="none" stroke="${c.ink}" stroke-width="7"/>
		<rect x="-36" y="-30" width="32" height="24" rx="10" fill="rgba(150,210,255,.75)" stroke="${c.ink}" stroke-width="4"/>
		<rect x="4" y="-30" width="32" height="24" rx="10" fill="rgba(150,210,255,.75)" stroke="${c.ink}" stroke-width="4"/>`,
	ski_goggles: (c) => `<path d="M-50,-12 Q0,-20 50,-12" fill="none" stroke="${c.ink}" stroke-width="8"/>
		<path d="M-40,-24 Q0,-34 40,-24 Q44,-4 26,2 Q0,-6 -26,2 Q-44,-4 -40,-24 Z" fill="#1E2A3A" stroke="${c.ink}" stroke-width="4"/>
		<path d="M-28,-18 Q-10,-24 4,-20" fill="none" stroke="#9EE7FF" stroke-width="4" stroke-linecap="round"/>`,
	sunglasses: (c) => `<path d="M-38,-12 L-2,-12 L-6,4 Q-20,10 -34,4 Z M2,-12 L38,-12 L34,4 Q20,10 6,4 Z" fill="#1B1B1F" stroke="${c.ink}" stroke-width="2.5" stroke-linejoin="round"/>
		<path d="M-2,-10 L2,-10 M-38,-12 L-48,-16 M38,-12 L48,-16" stroke="${c.ink}" stroke-width="3.5"/><path d="M-30,-8 L-22,-8" stroke="#fff" stroke-width="2.5" opacity=".6"/>`,
	eyepatch: (c) => `<path d="M-46,-22 L46,10" stroke="${c.ink}" stroke-width="3.5"/><ellipse cx="-16" cy="-8" rx="13" ry="11" fill="#1B1B1F"/>`,
	tilak: () => `<path d="M-8,-36 L-8,-20 M8,-36 L8,-20" stroke="#F4F1EA" stroke-width="3.5" stroke-linecap="round"/><path d="M0,-38 L0,-18" stroke="#E5383B" stroke-width="5" stroke-linecap="round"/>`,
	shikha: (c) => `<path d="M0,-48 Q6,-66 -6,-80 Q14,-74 10,-50" fill="${c.hairInk}"/>`,
	sage_bun: () => `<circle cx="0" cy="-58" r="17" fill="#F4F1EA" stroke="#B8B2A6" stroke-width="2.5"/><path d="M-44,-10 Q-46,-40 -20,-48 M44,-10 Q46,-40 20,-48" fill="none" stroke="#F4F1EA" stroke-width="8" stroke-linecap="round"/>`,
	white_beard: () => `<path d="M-36,4 Q-36,78 0,92 Q36,78 36,4 Q20,24 0,24 Q-20,24 -36,4 Z" fill="#F4F1EA" stroke="#B8B2A6" stroke-width="2.5"/><path d="M-16,10 Q-8,4 0,9 Q8,4 16,10" fill="none" stroke="#E2DDD2" stroke-width="6" stroke-linecap="round"/>`,
	headset: (c) => `<path d="M-52,2 A52,54 0 0 1 52,2" fill="none" stroke="${c.kHat}" stroke-width="10" stroke-linecap="round"/>
		<rect x="-64" y="-14" width="20" height="34" rx="8" fill="${c.kHat}" stroke="${c.ink}" stroke-width="3"/><rect x="44" y="-14" width="20" height="34" rx="8" fill="${c.kHat}" stroke="${c.ink}" stroke-width="3"/>
		<path d="M-56,16 Q-50,40 -18,30" fill="none" stroke="${c.ink}" stroke-width="4"/><circle cx="-16" cy="30" r="5" fill="${c.ink}"/>`,
	lashes: (c) => `<path d="M-24,-12 L-30,-18 M-21,-14 L-24,-21 M24,-12 L30,-18 M21,-14 L24,-21" stroke="${c.ink}" stroke-width="3" stroke-linecap="round"/>`,
};
// body-local (neck at 0,0, hip at 0,108)
const BODY_BACK = {
	backpack: (c) => `<rect x="-58" y="14" width="34" height="66" rx="12" fill="${c.acc}"/><rect x="-54" y="44" width="26" height="18" rx="5" fill="rgba(0,0,0,.2)"/>`,
	hoodie: (c) => `<path d="M-34,4 Q0,-12 34,4 L40,124 Q0,138 -40,124 Z" fill="${c.acc}"/><path d="M-16,84 L16,84" stroke="rgba(0,0,0,.25)" stroke-width="5" stroke-linecap="round"/><path d="M-6,8 L-8,40 M6,8 L8,40" stroke="rgba(255,255,255,.7)" stroke-width="3" stroke-linecap="round"/>`,
	dress: (c) => `<path d="M0,10 L-48,150 Q0,166 48,150 Z" fill="${c.acc}"/>`,
	coat: (c) => `<path d="M-32,2 L-40,132 L-5,132 L0,24 L5,132 L40,132 L32,2 Q0,-6 -32,2 Z" fill="#F7F7F4" stroke="rgba(0,0,0,.25)" stroke-width="3"/><circle cx="-10" cy="60" r="3" fill="#999"/><circle cx="-10" cy="84" r="3" fill="#999"/>`,
};
const BODY_FRONT = {
	scarf: (c) => `<path d="M-26,-2 Q0,14 26,-2" fill="none" stroke="${c.acc}" stroke-width="15" stroke-linecap="round"/><path d="M18,6 Q${f(42 + c.sw * 6)},28 ${f(52 + c.sw * 10)},${f(54 + c.sw * 6)}" fill="none" stroke="${c.acc}" stroke-width="13" stroke-linecap="round"/>`,
	tie: (c) => `<path d="M-8,2 L8,2 L4,14 L10,72 L0,86 L-10,72 L-4,14 Z" fill="${c.acc}"/><path d="M-14,-4 L0,6 L14,-4" fill="none" stroke="${c.ink}" stroke-width="3"/>`,
	bowtie: (c) => (c.bow ? `<g transform="translate(0 ${f(10 - 10 * c.bow)}) scale(${c.bow})">` : '') + `<path d="M-16,2 L0,10 L16,2 L16,20 L0,10 L-16,20 Z" fill="${c.acc}"/><circle cx="0" cy="10" r="4" fill="${c.acc}"/>`
		+ (c.bow ? `<path d="M-16,2 L0,10 L16,2 L16,20 L0,10 L-16,20 Z" fill="none" stroke="rgba(0,0,0,.55)" stroke-width="1.6" stroke-linejoin="round"/></g>` : ''),
};

// ---------------------------------------------------------------- costume rig
// Clothes that follow the body: sleeves are drawn along the arm, trousers / lungi along the legs, the cape hangs
// from the shoulders and swings with the movement, props sit in the hands. An avatar gets them with
//   "costume": {top, bottom, shoes, cape, wrist, belt, hold_r, hold_l}   (see stickman.json: minimal, warrior, villager)

const PATTERNS = {
	check: (id, base, a, b) => `<pattern id="${id}" width="22" height="22" patternUnits="userSpaceOnUse">
		<rect width="22" height="22" fill="${base}"/><rect width="22" height="6" fill="${a}" opacity=".65"/><rect width="6" height="22" fill="${a}" opacity=".65"/>
		<rect y="13" width="22" height="2" fill="${b}" opacity=".8"/><rect x="13" width="2" height="22" fill="${b}" opacity=".8"/></pattern>`,
	spots: (id, base, a) => `<pattern id="${id}" width="26" height="24" patternUnits="userSpaceOnUse">
		<rect width="26" height="24" fill="${base}"/><ellipse cx="7" cy="7" rx="4.5" ry="3.5" fill="${a}"/><ellipse cx="19" cy="17" rx="4" ry="3" fill="${a}"/><ellipse cx="20" cy="4" rx="2.5" ry="2" fill="${a}"/></pattern>`,
	stripes: (id, base, a) => `<pattern id="${id}" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="${base}"/><rect width="18" height="7" fill="${a}"/></pattern>`,
};

// props an outfit holds (costume hold_r / hold_l): h = the hand, s = 1 right hand / -1 left hand, L = outline colour
const PROPS = {
	laptop: (h, s, L) => `<g transform="translate(${f(h[0])} ${f(h[1])})"><rect x="-34" y="-6" width="68" height="44" rx="4" fill="#C9CED6" stroke="${L}" stroke-width="3"/><path d="M-30,-2 L30,-2 L30,30 L-30,30 Z" fill="#3B6FB6"/><path d="M-40,38 L40,38 L36,46 L-36,46 Z" fill="#9AA3AD" stroke="${L}" stroke-width="3"/></g>`,
	clipboard: (h, s, L) => `<g transform="translate(${f(h[0] + s * 6)} ${f(h[1] - 30)}) rotate(${s * 8})"><rect x="-22" y="-30" width="44" height="58" rx="4" fill="#8B5A2B" stroke="${L}" stroke-width="3"/><rect x="-17" y="-22" width="34" height="44" fill="#FFFFFF"/><path d="M-12,-12 L12,-12 M-12,-2 L12,-2 M-12,8 L6,8" stroke="#9AA3AD" stroke-width="3"/><rect x="-8" y="-34" width="16" height="8" rx="2" fill="#9AA3AD" stroke="${L}" stroke-width="2"/></g>`,
	flask: (h, s, L) => `<g transform="translate(${f(h[0] + s * 4)} ${f(h[1] - 34)})"><path d="M-6,-24 L6,-24 L6,-6 L22,22 Q24,30 16,30 L-16,30 Q-24,30 -22,22 L-6,-6 Z" fill="rgba(220,240,255,.85)" stroke="${L}" stroke-width="3"/><path d="M-17,14 L17,14 L21,22 Q22,28 16,28 L-16,28 Q-22,28 -21,22 Z" fill="#3DBE4F"/><circle cx="4" cy="6" r="3" fill="#3DBE4F"/></g>`,
	blueprint: (h, s, L) => `<g transform="translate(${f(h[0])} ${f(h[1] - 6)}) rotate(${s * -30})"><rect x="-8" y="-40" width="16" height="80" rx="8" fill="#5B8FD6" stroke="${L}" stroke-width="3"/><path d="M-8,-30 L8,-30 M-8,30 L8,30" stroke="#E4EEFA" stroke-width="2.5"/></g>`,
	baton: (h, s, L) => `<path d="M${f(h[0])},${f(h[1])} L${f(h[0] + s * 46)},${f(h[1] + 34)}" stroke="${L}" stroke-width="12" stroke-linecap="round"/><path d="M${f(h[0])},${f(h[1])} L${f(h[0] + s * 46)},${f(h[1] + 34)}" stroke="#2A2420" stroke-width="7" stroke-linecap="round"/>`,
	pan: (h, s, L, OW, t) => { const fl = Math.sin(t * 9) * 4; return `<g transform="translate(${f(h[0] + s * 40)} ${f(h[1] - 6)})"><path d="M${-s * 40},6 L${-s * 18},2" stroke="#2A2420" stroke-width="7" stroke-linecap="round"/><ellipse cx="0" cy="0" rx="26" ry="9" fill="#3A3A40" stroke="${L}" stroke-width="3"/>
		<path d="M-14,-4 Q-18,${f(-34 + fl)} -4,${f(-50 - fl)} Q-2,-30 6,-26 Q10,${f(-50 + fl)} 18,${f(-40 - fl)} Q22,-16 14,-4 Z" fill="#FF8A1F"/><path d="M-6,-6 Q-6,-26 2,-34 Q6,-20 8,-6 Z" fill="#FFD23F"/></g>`; },
	wrench: (h, s, L) => `<g transform="translate(${f(h[0])} ${f(h[1])}) rotate(${s * -35})"><rect x="-4" y="-46" width="8" height="52" rx="3" fill="#9AA3AD" stroke="${L}" stroke-width="2.5"/><path d="M-12,-50 Q-14,-64 0,-66 Q14,-64 12,-50 L6,-52 L6,-60 L-6,-60 L-6,-52 Z" fill="#9AA3AD" stroke="${L}" stroke-width="2.5"/></g>`,
	box: (h, s, L) => `<g transform="translate(${f(h[0] - s * 16)} ${f(h[1] - 22)})"><rect x="-32" y="-26" width="64" height="52" rx="3" fill="#C8955A" stroke="${L}" stroke-width="3"/><path d="M-32,-12 L32,-12 M0,-26 L0,-12" stroke="#9C6B36" stroke-width="5"/><path d="M-8,4 L8,4 L8,16 L-8,16 Z" fill="#F4F1EA"/></g>`,
	steering: (h, s, L) => `<g transform="translate(${f(h[0] - s * 16)} ${f(h[1] - 6)})"><circle r="30" fill="none" stroke="${L}" stroke-width="12"/><circle r="30" fill="none" stroke="#3A3A40" stroke-width="7"/><path d="M-28,0 L28,0 M0,0 L0,28" stroke="#3A3A40" stroke-width="6"/><circle r="8" fill="#9AA3AD" stroke="${L}" stroke-width="2"/></g>`,
	pointer: (h, s, L) => `<path d="M${f(h[0])},${f(h[1])} L${f(h[0] + s * 80)},${f(h[1] - 70)}" stroke="${L}" stroke-width="8" stroke-linecap="round"/><path d="M${f(h[0])},${f(h[1])} L${f(h[0] + s * 80)},${f(h[1] - 70)}" stroke="#8B5A2B" stroke-width="4.5" stroke-linecap="round"/>`,
	ball: (h, s, L) => `<g transform="translate(${f(h[0] + s * 10)} ${f(h[1] - 22)})"><circle r="22" fill="#FFFFFF" stroke="${L}" stroke-width="3"/><path d="M0,-8 L8,-2 L5,8 L-5,8 L-8,-2 Z" fill="#1B1B1F"/><path d="M0,-8 L0,-22 M8,-2 L20,-8 M5,8 L12,18 M-5,8 L-12,18 M-8,-2 L-20,-8" stroke="#1B1B1F" stroke-width="2"/></g>`,
	controller: (h, s, L) => `<g transform="translate(${f(h[0] - s * 10)} ${f(h[1] - 6)})"><path d="M-30,-10 Q-36,-14 -40,0 Q-42,18 -30,18 Q-22,18 -16,8 L16,8 Q22,18 30,18 Q42,18 40,0 Q36,-14 30,-10 Z" fill="#3A3A40" stroke="${L}" stroke-width="3"/><path d="M-26,0 L-16,0 M-21,-5 L-21,5" stroke="#FFFFFF" stroke-width="3"/><circle cx="20" cy="-2" r="3.5" fill="#E5383B"/><circle cx="27" cy="3" r="3.5" fill="#3DBE4F"/></g>`,
	camera: (h, s, L) => `<g transform="translate(${f(h[0] - s * 8)} ${f(h[1] - 14)})"><rect x="-30" y="-20" width="60" height="40" rx="6" fill="#2A2A30" stroke="${L}" stroke-width="3"/><circle cx="${s * 4}" cy="0" r="14" fill="#4A4A55" stroke="#9AA3AD" stroke-width="3"/><circle cx="${s * 4}" cy="0" r="6" fill="#5B8FD6"/><rect x="-24" y="-28" width="16" height="8" rx="2" fill="#2A2A30"/></g>`,
	mic: (h, s, L) => `<g transform="translate(${f(h[0])} ${f(h[1])}) rotate(${s * 20})"><rect x="-4" y="-34" width="8" height="40" rx="3" fill="#2A2A30" stroke="${L}" stroke-width="2"/><circle cx="0" cy="-40" r="11" fill="#9AA3AD" stroke="${L}" stroke-width="2.5"/><rect x="-9" y="-24" width="18" height="10" rx="2" fill="#C0262D"/></g>`,
	guitar: (h, s, L) => `<g transform="translate(${f(h[0] - s * 38)} ${f(h[1] - 30)}) rotate(${s * -60}) scale(1.45)"><path d="M-22,10 Q-36,-6 -22,-20 Q-14,-26 -6,-18 Q2,-26 12,-18 Q26,-4 12,14 Q-4,30 -22,10 Z" fill="#C0262D" stroke="${L}" stroke-width="3"/><circle cx="-6" cy="-2" r="6" fill="#1B1B1F"/><rect x="-3" y="-80" width="7" height="66" fill="#6B3F1D" stroke="${L}" stroke-width="2"/><rect x="-6" y="-90" width="13" height="14" rx="2" fill="#2A2420"/></g>`,
	tripod: (h, s, L) => `<g transform="translate(${f(h[0] + s * 50)} ${f(h[1] - 30)})"><path d="M0,10 L-30,180 M0,10 L30,180 M0,10 L0,180" stroke="${L}" stroke-width="4"/><rect x="-24" y="-16" width="48" height="30" rx="5" fill="#2A2A30" stroke="${L}" stroke-width="3"/><circle cx="${s * 18}" cy="-1" r="9" fill="#5B8FD6" stroke="#9AA3AD" stroke-width="2.5"/></g>`,
	book: (h, s, L) => `<g transform="translate(${f(h[0] + s * 4)} ${f(h[1] - 18)}) rotate(${s * 10})"><rect x="-20" y="-24" width="40" height="48" rx="3" fill="#3B6FB6" stroke="${L}" stroke-width="3"/><path d="M-14,-24 L-14,24" stroke="rgba(0,0,0,.3)" stroke-width="3"/><path d="M-6,-10 L12,-10 M-6,-2 L12,-2" stroke="#F4F1EA" stroke-width="2.5"/></g>`,
	handbag: (h, s, L) => `<g transform="translate(${f(h[0])} ${f(h[1] + 4)})"><path d="M-12,4 Q-12,-14 0,-14 Q12,-14 12,4" fill="none" stroke="${L}" stroke-width="4"/><path d="M-22,4 L22,4 L26,36 Q0,42 -26,36 Z" fill="#E86FA0" stroke="${L}" stroke-width="3"/></g>`,
	sword: (h, s, L) => `<g transform="translate(${f(h[0])} ${f(h[1])}) rotate(${s * 25})"><path d="M-5,-10 L5,-10 L4,-100 L0,-112 L-4,-100 Z" fill="#D7DCE2" stroke="${L}" stroke-width="2.5"/><rect x="-16" y="-12" width="32" height="7" rx="2" fill="#B47F12" stroke="${L}" stroke-width="2"/><rect x="-4" y="-6" width="8" height="18" rx="2" fill="#6B3F1D"/></g>`,
	katana: (h, s, L) => `<g transform="translate(${f(h[0])} ${f(h[1])}) rotate(${s * 30})"><path d="M-3,-8 Q-6,-70 4,-118 Q8,-70 4,-8 Z" fill="#E4E7EB" stroke="${L}" stroke-width="2.5"/><ellipse cx="0" cy="-8" rx="10" ry="4" fill="#B47F12" stroke="${L}" stroke-width="2"/><rect x="-3.5" y="-6" width="7" height="24" rx="2" fill="#1B1B1F"/></g>`,
	magic_staff: (h, s, L, OW, t) => `<path d="M${f(h[0])},${f(h[1] + 160)} L${f(h[0])},${f(h[1] - 70)}" stroke="${L}" stroke-width="10" stroke-linecap="round"/><path d="M${f(h[0])},${f(h[1] + 160)} L${f(h[0])},${f(h[1] - 70)}" stroke="#6B3F1D" stroke-width="6" stroke-linecap="round"/>
		<circle cx="${f(h[0])}" cy="${f(h[1] - 84)}" r="${f(20 + Math.sin(t * 5) * 3)}" fill="#7FD3FF" opacity=".35"/><circle cx="${f(h[0])}" cy="${f(h[1] - 84)}" r="12" fill="#BDEBFF" stroke="#3FA9F5" stroke-width="3"/>`,
	axe: (h, s, L) => `<g transform="translate(${f(h[0])} ${f(h[1])}) rotate(${s * 15})"><rect x="-4" y="-80" width="8" height="100" rx="3" fill="#8B5A2B" stroke="${L}" stroke-width="2.5"/><path d="M4,-80 Q36,-86 34,-50 Q20,-58 4,-56 Z" fill="#9AA3AD" stroke="${L}" stroke-width="2.5"/></g>`,
	fire_axe: (h, s, L) => `<g transform="translate(${f(h[0])} ${f(h[1])}) rotate(${s * 15})"><rect x="-4" y="-80" width="8" height="100" rx="3" fill="#C0262D" stroke="${L}" stroke-width="2.5"/><path d="M4,-80 Q36,-86 34,-50 Q20,-58 4,-56 Z" fill="#D7DCE2" stroke="${L}" stroke-width="2.5"/><path d="M-4,-72 L-20,-80 L-4,-60 Z" fill="#D7DCE2" stroke="${L}" stroke-width="2"/></g>`,
	bow: (h, s, L) => `<path d="M${f(h[0])},${f(h[1] - 80)} Q${f(h[0] + s * 46)},${f(h[1])} ${f(h[0])},${f(h[1] + 80)}" fill="none" stroke="${L}" stroke-width="8" stroke-linecap="round"/><path d="M${f(h[0])},${f(h[1] - 80)} Q${f(h[0] + s * 46)},${f(h[1])} ${f(h[0])},${f(h[1] + 80)}" fill="none" stroke="#8B5A2B" stroke-width="5" stroke-linecap="round"/>
		<path d="M${f(h[0])},${f(h[1] - 78)} L${f(h[0])},${f(h[1] + 78)}" stroke="#E4E7EB" stroke-width="2"/>`,
	lasso: (h, s, L) => `<ellipse cx="${f(h[0] + s * 30)}" cy="${f(h[1] + 20)}" rx="26" ry="16" fill="none" stroke="#C8955A" stroke-width="5"/><path d="M${f(h[0])},${f(h[1])} Q${f(h[0] + s * 10)},${f(h[1] + 30)} ${f(h[0] + s * 8)},${f(h[1] + 60)}" fill="none" stroke="#C8955A" stroke-width="5"/>`,
	cutlass: (h, s, L) => `<g transform="translate(${f(h[0])} ${f(h[1])}) rotate(${s * 30})"><path d="M-4,-10 Q-10,-60 8,-100 Q14,-60 6,-10 Z" fill="#D7DCE2" stroke="${L}" stroke-width="2.5"/><path d="M-14,-12 Q0,6 14,-12" fill="none" stroke="#B47F12" stroke-width="5"/><rect x="-3.5" y="-8" width="7" height="18" rx="2" fill="#6B3F1D"/></g>`,
	// a furled umbrella carried like a walking stick (an open one would cover the head with the arm down)
	umbrella: (h, s, L) => `<path d="M${f(h[0])},${f(h[1] - 6)} L${f(h[0] + s * 8)},392" stroke="${L}" stroke-width="5"/><path d="M${f(h[0] + s * 1)},${f(h[1] + 30)} Q${f(h[0] - 12)},${f(h[1] + 110)} ${f(h[0] + s * 7)},${f(h[1] + 170)} Q${f(h[0] + 16)},${f(h[1] + 110)} ${f(h[0] + s * 2)},${f(h[1] + 30)} Z" fill="#2F7FD0" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>
		<path d="M${f(h[0])},${f(h[1] - 6)} q${s * -12},-16 ${s * -22},0" fill="none" stroke="${L}" stroke-width="5" stroke-linecap="round"/>`,
	umbrella_open: (h, s, L) => `<path d="M${f(h[0])},${f(h[1])} L${f(h[0])},${f(h[1] - 150)}" stroke="${L}" stroke-width="5"/><path d="M${f(h[0] - 70)},${f(h[1] - 130)} Q${f(h[0])},${f(h[1] - 220)} ${f(h[0] + 70)},${f(h[1] - 130)} Q${f(h[0] + 46)},${f(h[1] - 140)} ${f(h[0] + 23)},${f(h[1] - 130)} Q${f(h[0])},${f(h[1] - 142)} ${f(h[0] - 23)},${f(h[1] - 130)} Q${f(h[0] - 46)},${f(h[1] - 140)} ${f(h[0] - 70)},${f(h[1] - 130)} Z" fill="#2F7FD0" stroke="${L}" stroke-width="3.5" stroke-linejoin="round"/>
		<path d="M${f(h[0])},${f(h[1])} q${s * 10},12 ${s * 18},0" fill="none" stroke="${L}" stroke-width="5" stroke-linecap="round"/>`,
	fishing_rod: (h, s, L, OW, t) => `<path d="M${f(h[0])},${f(h[1])} Q${f(h[0] + s * 70)},${f(h[1] - 120)} ${f(h[0] + s * 130)},${f(h[1] - 130)}" fill="none" stroke="#6B3F1D" stroke-width="5"/><path d="M${f(h[0] + s * 130)},${f(h[1] - 130)} L${f(h[0] + s * 132)},${f(h[1] - 40 + Math.sin(t * 3) * 6)}" stroke="#E4E7EB" stroke-width="2"/><circle cx="${f(h[0] + s * 132)}" cy="${f(h[1] - 36 + Math.sin(t * 3) * 6)}" r="5" fill="#E5383B"/>`,
	net: (h, s, L) => `<path d="M${f(h[0])},${f(h[1])} L${f(h[0] + s * 30)},${f(h[1] + 40)}" stroke="#8B5A2B" stroke-width="5"/><ellipse cx="${f(h[0] + s * 44)}" cy="${f(h[1] + 64)}" rx="24" ry="28" fill="rgba(255,255,255,.2)" stroke="#8B5A2B" stroke-width="3"/><path d="M${f(h[0] + s * 28)},${f(h[1] + 50)} L${f(h[0] + s * 60)},${f(h[1] + 80)} M${f(h[0] + s * 60)},${f(h[1] + 50)} L${f(h[0] + s * 28)},${f(h[1] + 80)}" stroke="#8B5A2B" stroke-width="2"/>`,
	sapling: (h, s, L) => `<g transform="translate(${f(h[0])} ${f(h[1] - 10)})"><path d="M0,0 L0,-60" stroke="#5A7D2B" stroke-width="5"/><path d="M0,-30 Q-26,-40 -30,-62 Q-6,-56 0,-34 Z M0,-46 Q24,-58 30,-80 Q4,-74 0,-50 Z M0,-58 Q-14,-80 -4,-96 Q8,-80 0,-60 Z" fill="#6CB33F" stroke="${L}" stroke-width="2.5"/><path d="M-10,0 L10,0 L7,14 L-7,14 Z" fill="#8B5A2B" stroke="${L}" stroke-width="2"/></g>`,
	pot: (h, s, L) => `<g transform="translate(${f(h[0] + s * 18)} ${f(h[1] - 18)})"><path d="M-12,-30 L12,-30 L10,-20 Q30,-12 30,8 Q30,32 0,34 Q-30,32 -30,8 Q-30,-12 -10,-20 Z" fill="#C8642F" stroke="${L}" stroke-width="3"/><path d="M-26,0 Q0,8 26,0" fill="none" stroke="#F2B33D" stroke-width="4"/></g>`,
	pole: (h, s, L) => `<path d="M${f(h[0])},${f(h[1] - 20)} L${f(h[0] + s * 14)},396" stroke="${L}" stroke-width="7" stroke-linecap="round"/><path d="M${f(h[0])},${f(h[1] - 20)} L${f(h[0] + s * 14)},396" stroke="#9AA3AD" stroke-width="4" stroke-linecap="round"/><path d="M${f(h[0] - 6)},${f(h[1] - 18)} L${f(h[0] + 6)},${f(h[1] - 18)}" stroke="#1B1B1F" stroke-width="7" stroke-linecap="round"/>`,
	ice_axe: (h, s, L) => `<g transform="translate(${f(h[0])} ${f(h[1])}) rotate(${s * 20})"><rect x="-3.5" y="-70" width="7" height="90" rx="3" fill="#2F7FD0" stroke="${L}" stroke-width="2"/><path d="M-30,-72 Q0,-80 26,-70 L28,-64 Q0,-70 -24,-62 Z" fill="#9AA3AD" stroke="${L}" stroke-width="2.5"/></g>`,
	scroll: (h, s, L) => `<g transform="translate(${f(h[0] + s * 4)} ${f(h[1] - 18)})"><rect x="-20" y="-22" width="40" height="44" fill="#F1E2C0" stroke="${L}" stroke-width="2.5"/><rect x="-24" y="-28" width="48" height="10" rx="5" fill="#C8955A" stroke="${L}" stroke-width="2.5"/><rect x="-24" y="18" width="48" height="10" rx="5" fill="#C8955A" stroke="${L}" stroke-width="2.5"/><path d="M-12,-8 L12,-8 M-12,0 L12,0 M-12,8 L6,8" stroke="#8C6420" stroke-width="2"/></g>`,
	torch: (h, s, L, OW, t) => `<path d="M${f(h[0])},${f(h[1] + 20)} L${f(h[0])},${f(h[1] - 40)}" stroke="#6B3F1D" stroke-width="8" stroke-linecap="round"/><path d="M${f(h[0] - 12)},${f(h[1] - 40)} Q${f(h[0] - 14 + Math.sin(t * 9) * 3)},${f(h[1] - 70)} ${f(h[0])},${f(h[1] - 86)} Q${f(h[0] + 14)},${f(h[1] - 66)} ${f(h[0] + 12)},${f(h[1] - 40)} Z" fill="#FF8A1F"/>`,
	sceptre: (h, s, L) => `<path d="M${f(h[0])},${f(h[1] + 40)} L${f(h[0])},${f(h[1] - 70)}" stroke="${L}" stroke-width="10" stroke-linecap="round"/><path d="M${f(h[0])},${f(h[1] + 40)} L${f(h[0])},${f(h[1] - 70)}" stroke="#F2B33D" stroke-width="6" stroke-linecap="round"/>
		<circle cx="${f(h[0])}" cy="${f(h[1] - 80)}" r="12" fill="#E5383B" stroke="#B47F12" stroke-width="3.5"/><path d="M${f(h[0] - 10)},${f(h[1] - 66)} L${f(h[0] + 10)},${f(h[1] - 66)}" stroke="#F2B33D" stroke-width="5"/>`,
	quiver: () => '',
};

const costumeKit = ({cos, OL, OW, TW, op, t, moving, lean, P, g, ink}) => {
	const defs = [];
	const fillOf = (spec, fallback) => {
		if (!spec || !spec.pattern || !PATTERNS[spec.pattern]) return spec && spec.color || fallback;
		const id = `pt_${spec.pattern}_${String(spec.color || '').replace('#', '')}`;
		defs.push(PATTERNS[spec.pattern](id, spec.color || fallback, spec.color2 || '#ffffff', spec.color3 || '#1B1B1F'));
		return `url(#${id})`;
	};
	// a coloured tube along part [a..b] (0 = start, 1 = end) of a limb path, with the same dark outline as the body
	const ctube = (d, a, b, color, w = TW + 6) => {
		const len = Math.max(0.001, b - a);
		const dash = ` pathLength="1" stroke-dasharray="${f(len * 1000) / 1000} 2" stroke-dashoffset="${f(-a * 1000) / 1000}"`;
		return `<path d="${d}" fill="none" stroke="${OL}" stroke-width="${f(w + OW * 2)}" stroke-linecap="round" stroke-linejoin="round"${dash}${op}/>`
			+ `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${dash}${op}/>`;
	};
	const top = cos.top || null, bottom = cos.bottom || null, shoes = cos.shoes || null;
	const swing = moving ? Math.sin(t * 7) : Math.sin(t * 1.6) * 0.35;
	const k = {
		// behind everything: the cape, hanging from the shoulders, swinging (more when walking / running)
		cape: () => {
			if (!cos.cape) return '';
			const sx = f(-10 - Math.abs(swing) * 18 - (moving ? 26 : 0)), w2 = f(58 + Math.abs(swing) * 10);
			return `<g transform="${g.bodyT}"${op}><path d="M-30,6 Q-40,90 ${f(-w2 + sx * 0.6)},${f(198 + swing * 6)} Q${sx},${f(214 + swing * 4)} ${f(w2 * 0.8 + sx)},${f(196 - swing * 6)} Q40,90 30,6 Q0,-4 -30,6 Z"
				fill="${cos.cape.color}" stroke="${OL}" stroke-width="${OW}" stroke-linejoin="round"/>
				<path d="M-12,40 Q${f(-16 + sx * 0.4)},120 ${f(-22 + sx * 0.8)},196 M12,40 Q${f(10 + sx * 0.4)},120 ${f(8 + sx * 0.8)},196" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="5" stroke-linecap="round"/></g>`;
		},
		// over the white legs: trousers / shorts, boots, sandals
		legs: () => {
			const out = [];
			if (bottom && (bottom.kind === 'pants' || bottom.kind === 'shorts')) {
				const len = bottom.kind === 'shorts' ? (bottom.len || 0.42) : (bottom.len || 0.9);
				const col = fillOf(bottom, '#3A5FA0');
				out.push(ctube(g.legL, 0, len, col, TW + 7), ctube(g.legR, 0, len, col, TW + 7));
				out.push(`<path d="M${f(g.hipL[0] - 10)},${f(g.hip[1] - 6)} L${f(g.hipR[0] + 10)},${f(g.hip[1] - 6)} L${f(g.hipR[0] + 6)},${f(g.hip[1] + 20)} L${f(g.hipL[0] - 6)},${f(g.hip[1] + 20)} Z" fill="${col}" stroke="${OL}" stroke-width="${OW}" stroke-linejoin="round"${op}/>`);
			}
			if (shoes && shoes.kind === 'boots') out.push(ctube(g.legL, 0.74, 1, shoes.color, TW + 6), ctube(g.legR, 0.74, 1, shoes.color, TW + 6));
			return out.join('');
		},
		foot: (p, side) => {
			if (!shoes) return null;
			const x = f(p[0] + side * 6), y = f(p[1] - 1);
			if (shoes.kind === 'sandals') {
				return `<ellipse cx="${x}" cy="${y}" rx="15" ry="8" fill="#FFFFFF" stroke="${OL}" stroke-width="${OW}"${op}/>`
					+ `<path d="M${f(p[0] + side * 6 - 15)},${f(p[1] + 6)} L${f(p[0] + side * 6 + 15)},${f(p[1] + 6)}" stroke="${shoes.color}" stroke-width="6" stroke-linecap="round"${op}/>`
					+ `<path d="M${f(p[0] + side * 6 - 8)},${f(p[1] - 6)} L${f(p[0] + side * 6 + 6)},${f(p[1] + 4)} M${f(p[0] - 2)},${f(p[1] - 12)} L${f(p[0] + 2)},${f(p[1] - 2)}" stroke="${shoes.color}" stroke-width="4.5" stroke-linecap="round"${op}/>`;
			}
			if (shoes.kind === 'shoe') {
				return `<path d="M${f(p[0] + side * 6 - 15)},${f(p[1] + 6)} Q${f(p[0] + side * 6 - 16)},${f(p[1] - 9)} ${f(p[0] + side * 6 + 2)},${f(p[1] - 8)} Q${f(p[0] + side * 6 + 18)},${f(p[1] - 4)} ${f(p[0] + side * 6 + 18)},${f(p[1] + 6)} Z" fill="${shoes.color}" stroke="${OL}" stroke-width="${OW}" stroke-linejoin="round"${op}/>`
					+ `<path d="M${f(p[0] + side * 6 - 4)},${f(p[1] - 5)} Q${f(p[0] + side * 6 + 6)},${f(p[1] - 6)} ${f(p[0] + side * 6 + 10)},${f(p[1] - 2)}" fill="none" stroke="#fff" stroke-width="2.5" opacity=".5"${op}/>`;
			}
			return `<ellipse cx="${x}" cy="${y}" rx="17" ry="9" fill="${shoes.color}" stroke="${OL}" stroke-width="${OW}"${op}/>`
				+ (shoes.kind === 'sneakers' ? `<path d="M${f(p[0] + side * 6 - 15)},${f(p[1] + 3)} L${f(p[0] + side * 6 + 15)},${f(p[1] + 3)}" stroke="#fff" stroke-width="4"${op}/>` : '');
		},
		// in front of the legs: a lungi / dhoti wrapped from the waist to the shins, opening as the legs move;
		// a skirt (A-line, to the knees) or a long saree / robe skirt (to the ankles) the same way
		wrap: () => {
			if (bottom && (bottom.kind === 'skirt' || bottom.kind === 'long_skirt')) {
				const len = bottom.kind === 'skirt' ? (bottom.len || 0.5) : (bottom.len || 0.95);
				const at = (L, u) => { const tq = u < 0.5 ? u * 2 : (u - 0.5) * 2; return u < 0.5 ? [lerp(L.a[0], L.e[0], tq), lerp(L.a[1], L.e[1], tq)] : [lerp(L.e[0], L.h[0], tq), lerp(L.e[1], L.h[1], tq)]; };
				const bl = at(g.ll, len), br = at(g.rl, len);
				const left = Math.min(bl[0], br[0]) - 26, right = Math.max(bl[0], br[0]) + 26, by = Math.max(bl[1], br[1]) + 2;
				const col = fillOf(bottom, '#C0262D');
				const border = bottom.border ? `<path d="M${f(left)},${f(by - 6)} Q${f((left + right) / 2)},${f(by + 2)} ${f(right)},${f(by - 6)}" fill="none" stroke="${bottom.border}" stroke-width="9"/>` : '';
				const pleats = bottom.kind === 'long_skirt' ? `<path d="M${f(g.hip[0] - 8)},${f(g.hip[1])} L${f(g.hip[0] - 14)},${f(by)} M${f(g.hip[0] + 4)},${f(g.hip[1])} L${f(g.hip[0] + 2)},${f(by)} M${f(g.hip[0] + 14)},${f(g.hip[1])} L${f(g.hip[0] + 20)},${f(by)}" stroke="rgba(0,0,0,.16)" stroke-width="3"/>` : '';
				return `<g${op}><path d="M${f(g.hipL[0] - 14)},${f(g.hip[1] - 12)} L${f(g.hipR[0] + 14)},${f(g.hip[1] - 12)} L${f(right)},${f(by)} Q${f((left + right) / 2)},${f(by + 10)} ${f(left)},${f(by)} Z"
					fill="${col}" stroke="${OL}" stroke-width="${OW}" stroke-linejoin="round"/>${pleats}${border}</g>`;
			}
			if (!bottom || bottom.kind !== 'lungi') return '';
			const len = bottom.len || 0.78;
			const at = (L, u) => { const tq = u < 0.5 ? u * 2 : (u - 0.5) * 2; return u < 0.5 ? [lerp(L.a[0], L.e[0], tq), lerp(L.a[1], L.e[1], tq)] : [lerp(L.e[0], L.h[0], tq), lerp(L.e[1], L.h[1], tq)]; };
			const bl = at(g.ll, len), br = at(g.rl, len);
			const left = Math.min(bl[0], br[0]) - 18, right = Math.max(bl[0], br[0]) + 18, bottomY = Math.max(bl[1], br[1]) + 4;
			const col = fillOf(bottom, '#3E7CC4');
			return `<g${op}><path d="M${f(g.hipL[0] - 18)},${f(g.hip[1] - 10)} L${f(g.hipR[0] + 18)},${f(g.hip[1] - 10)} L${f(right)},${f(bottomY)} Q${f((left + right) / 2)},${f(bottomY + 8)} ${f(left)},${f(bottomY)} Z"
				fill="${col}" stroke="${OL}" stroke-width="${OW}" stroke-linejoin="round"/>
				<path d="M${f(g.hipL[0] - 16)},${f(g.hip[1] - 4)} L${f(g.hipR[0] + 16)},${f(g.hip[1] - 4)}" stroke="rgba(0,0,0,.25)" stroke-width="5"/>
				<path d="M${f(g.hip[0] + 6)},${f(g.hip[1])} Q${f(g.hip[0] + 10)},${f((g.hip[1] + bottomY) / 2)} ${f(g.hip[0] + 4 + (right - left) * 0.12)},${f(bottomY)}" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="3"/></g>`;
		},
		// on the torso (body frame): shirt with collar + buttons, or a bronze breastplate with a skirt of strips
		torso: () => {
			if (!top) return '';
			const col = fillOf(top, '#EDE6D6');
			if (top.shape === 'armor') {
				const strips = [-24, -12, 0, 12, 24].map((x, i) => `<rect x="${x - 6}" y="104" width="12" height="${36 + (i % 2) * 6}" rx="3" fill="${top.strips || '#B3261E'}" stroke="${OL}" stroke-width="2.5"/>`).join('');
				return `<g transform="${g.bodyT}"${op}>${strips}
					<path d="M-31,4 Q0,-8 31,4 Q36,60 30,110 Q0,120 -30,110 Q-36,60 -31,4 Z" fill="${col}" stroke="${OL}" stroke-width="${OW}" stroke-linejoin="round"/>
					<path d="M-20,30 Q0,42 20,30 M-22,60 Q0,72 22,60" fill="none" stroke="rgba(0,0,0,.22)" stroke-width="4" stroke-linecap="round"/>
					<path d="M-30,96 L30,96" stroke="${top.belt || '#6B3F1D'}" stroke-width="9"/><ellipse cx="-12" cy="20" rx="7" ry="11" fill="#fff" opacity=".28"/></g>`;
			}
			if (top.shape === 'suit') {
				const hem = top.length || 120;
				return `<g transform="${g.bodyT}"${op}>
					<path d="M-14,2 L14,2 L10,60 L-10,60 Z" fill="${top.shirt || '#FFFFFF'}"/>
					<path d="M-8,4 L8,4 L5,14 L10,62 L0,74 L-10,62 L-5,14 Z" fill="${top.tie || '#C0262D'}" stroke="${OL}" stroke-width="2"/>
					<path d="M-31,4 Q-14,-2 -12,2 L-2,58 L-8,${hem} Q-20,${hem + 6} -32,${hem} Q-36,60 -31,4 Z M31,4 Q14,-2 12,2 L2,58 L8,${hem} Q20,${hem + 6} 32,${hem} Q36,60 31,4 Z"
						fill="${col}" stroke="${OL}" stroke-width="${OW}" stroke-linejoin="round"/>
					<path d="M-12,2 L-20,30 L-8,40 M12,2 L20,30 L8,40" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="3" stroke-linejoin="round"/>
					<circle cx="-2" cy="76" r="3.2" fill="#000" opacity=".55"/><circle cx="-2" cy="94" r="3.2" fill="#000" opacity=".55"/>
					<path d="M-24,64 L-14,64" stroke="rgba(255,255,255,.3)" stroke-width="3"/></g>`;
			}
			if (top.shape === 'puffer') {      // a quilted puffer / snow jacket: puffy, with stitched bands
				const hem = top.length || 124;
				const bands = [28, 52, 76, 100].filter((y) => y < hem - 6).map((y) => `<path d="M-34,${y} Q0,${y + 8} 34,${y}" fill="none" stroke="rgba(0,0,0,.22)" stroke-width="3.5"/>`).join('');
				return `<g transform="${g.bodyT}"${op}><path d="M-34,2 Q0,-10 34,2 Q42,60 36,${hem} Q0,${hem + 10} -36,${hem} Q-42,60 -34,2 Z" fill="${col}" stroke="${OL}" stroke-width="${OW}" stroke-linejoin="round"/>
					${bands}<path d="M0,4 L0,${hem}" stroke="rgba(0,0,0,.25)" stroke-width="3"/><path d="M-22,-2 Q0,10 22,-2 L18,12 Q0,20 -18,12 Z" fill="${top.collarColor || col}" stroke="${OL}" stroke-width="2.5"/></g>`;
			}
			if (top.shape === 'hoodie') {
				const hem = top.length || 120;
				return `<g transform="${g.bodyT}"${op}><path d="M-31,4 Q0,-8 31,4 Q36,60 33,${hem} Q0,${hem + 8} -33,${hem} Q-36,60 -31,4 Z" fill="${col}" stroke="${OL}" stroke-width="${OW}" stroke-linejoin="round"/>
					<path d="M-20,${hem - 36} Q0,${hem - 46} 20,${hem - 36} L24,${hem - 12} L-24,${hem - 12} Z" fill="rgba(0,0,0,.12)" stroke="rgba(0,0,0,.28)" stroke-width="2.5"/>
					<path d="M-7,6 L-9,34 M7,6 L9,34" stroke="${top.strings || '#FFFFFF'}" stroke-width="3" stroke-linecap="round"/>
					<path d="M-33,${hem - 6} Q0,${hem + 2} 33,${hem - 6}" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="4"/></g>`;
			}
			if (top.shape === 'tunic') {
				const hem = top.length || 132;
				// ragged hem: a zigzag bottom edge (hand-made / tribal clothes)
				const start = top.oneShoulder ? 'M-30,4 Q-10,-6 0,4 L30,40' : 'M-30,4 Q0,-8 30,4';
				const bodyPath = top.ragged ? `${start} Q36,80 34,${hem - 2} ${[34, 26, 16, 6, -4, -14, -24, -34].map((x, i) => `L${x},${hem + (i % 2 ? 10 : -2)}`).join(' ')} Q-36,70 -30,4 Z` : `${start} Q36,80 34,${hem} Q0,${hem + 8} -34,${hem} Q-36,70 -30,4 Z`;
				const belt = top.belt ? `<path d="M-33,96 L33,96" stroke="${top.belt}" stroke-width="9"/><rect x="-6" y="91" width="12" height="10" rx="2" fill="#D9B45A" stroke="${OL}" stroke-width="2"/>` : '';
				const pouch = top.pouch ? `<path d="M14,98 L32,98 L31,120 Q23,126 15,120 Z" fill="${top.belt || '#6B3F1D'}" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>` : '';
				const folds = `<path d="M-14,40 Q-10,80 -16,${hem - 8} M10,50 Q14,86 10,${hem - 8}" fill="none" stroke="rgba(0,0,0,.16)" stroke-width="3.5" stroke-linecap="round"/>`;
				return `<g transform="${g.bodyT}"${op}><path d="${bodyPath}" fill="${col}" stroke="${OL}" stroke-width="${OW}" stroke-linejoin="round"/>${folds}${belt}${pouch}</g>`;
			}
			const collar = top.collar ? `<path d="M-14,2 L0,22 L14,2" fill="none" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/><path d="M-16,0 L-2,20 L-20,14 Z M16,0 L2,20 L20,14 Z" fill="${col}" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>` : '';
			const buttons = top.buttons ? [36, 58, 80].map((y) => `<circle cx="1" cy="${y}" r="3" fill="${OL}" opacity=".55"/>`).join('') : '';
			const pocket = top.pocket ? `<path d="M-22,36 L-8,36 L-8,50 L-22,50 Z" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="2.5"/>` : '';
			const hem = top.length || 116;
			return `<g transform="${g.bodyT}"${op}><path d="M-29,4 Q0,-8 29,4 Q34,60 31,${hem} Q0,${hem + 8} -31,${hem} Q-34,60 -29,4 Z" fill="${col}" stroke="${OL}" stroke-width="${OW}" stroke-linejoin="round"/>
				<path d="M1,22 L1,${hem - 4}" stroke="rgba(0,0,0,.18)" stroke-width="2.5"/>${collar}${buttons}${pocket}</g>`;
		},
		// on top of the torso: backpack straps, a shoulder bag across the body, and the outfit sheet's extras -
		// a hi-vis vest, an apron, a sash, a saree pallu, a chest badge, a jersey number, a knight's cross, epaulettes
		gear: () => {
			const out = [];
			const ex = [];
			if (cos.vest) ex.push(`<path d="M-30,4 L-12,4 L-6,60 L6,60 L12,4 L30,4 Q34,60 31,112 L-31,112 Q-34,60 -30,4 Z" fill="${cos.vest.color || '#F7C21B'}" stroke="${OL}" stroke-width="${OW}" stroke-linejoin="round"/>
				<path d="M-31,70 L-8,70 M8,70 L31,70 M-31,92 L31,92" stroke="${cos.vest.stripes || '#E4E7EB'}" stroke-width="7"/>`);
			if (cos.apron) ex.push(`<path d="M-18,30 L18,30 L26,170 Q0,178 -26,170 Z" fill="${cos.apron}" stroke="${OL}" stroke-width="${OW}" stroke-linejoin="round"/>
				<path d="M-18,30 Q-24,10 -14,2 M18,30 Q24,10 14,2" fill="none" stroke="${cos.apron}" stroke-width="5"/><path d="M-30,96 L30,96" stroke="${cos.apron}" stroke-width="6"/>`);
			if (cos.sash) ex.push(`<path d="M22,0 L34,10 L-24,112 L-36,100 Z" fill="${cos.sash}" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>`);
			if (cos.pallu) ex.push(`<path d="M24,-2 Q38,6 34,30 L-30,112 Q-38,104 -34,92 L16,10 Z" fill="${cos.pallu}" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>
				<path d="M34,22 L-28,106" stroke="${cos.pallu_border || '#F2B33D'}" stroke-width="6"/>`);
			if (cos.cross) ex.push(`<path d="M-6,20 L6,20 L6,48 L22,48 L22,58 L6,58 L6,96 L-6,96 L-6,58 L-22,58 L-22,48 L-6,48 Z" fill="${cos.cross}"/>`);
			if (cos.number) ex.push(`<text x="0" y="74" text-anchor="middle" font-family="Arial Black, Arial" font-weight="900" font-size="40" fill="${cos.numberColor || '#FFFFFF'}" stroke="${OL}" stroke-width="1.5">${cos.number}</text>`);
			if (cos.badge === 'star') ex.push(`<path d="M-18,24 l4,8 l9,1 l-6.5,6 l2,9 l-8.5,-4.5 l-8.5,4.5 l2,-9 l-6.5,-6 l9,-1 Z" fill="#F2B33D" stroke="#8C6420" stroke-width="1.5"/>`);
			if (cos.badge === 'logo') ex.push(`<rect x="-24" y="22" width="20" height="16" rx="3" fill="${cos.badgeColor || '#FFFFFF'}" stroke="${OL}" stroke-width="2"/><path d="M-18,26 L-10,30 L-18,34 Z" fill="${OL}"/>`);
			if (cos.badge === 'id') ex.push(`<rect x="10" y="40" width="18" height="24" rx="3" fill="#FFFFFF" stroke="${OL}" stroke-width="2"/><path d="M14,46 L24,46 M14,52 L24,52" stroke="#3B6FB6" stroke-width="2.5"/>`);
			if (cos.badge === 'stethoscope') ex.push(`<path d="M-16,2 Q-22,40 -6,52 Q8,60 14,40 L14,2" fill="none" stroke="#2F3A4A" stroke-width="4"/><circle cx="14" cy="58" r="7" fill="#9AA3AD" stroke="#2F3A4A" stroke-width="3"/>`);
			if (cos.epaulettes) ex.push(`<rect x="-36" y="0" width="16" height="7" rx="2" fill="${cos.epaulettes}"/><rect x="20" y="0" width="16" height="7" rx="2" fill="${cos.epaulettes}"/>`);
			if (cos.fire_stripes) ex.push(`<path d="M-33,88 L33,88 M-33,104 L33,104" stroke="#F7C21B" stroke-width="7"/><path d="M-33,88 L33,88 M-33,104 L33,104" stroke="#E4E7EB" stroke-width="2.5"/>`);
			if (ex.length) out.push(`<g transform="${g.bodyT}"${op}>${ex.join('')}</g>`);
			if (cos.straps) out.push(`<g transform="${g.bodyT}"${op}><path d="M-20,4 Q-24,50 -18,92 M20,4 Q24,50 18,92" fill="none" stroke="${OL}" stroke-width="${f(9 + OW * 2)}" stroke-linecap="round"/>
				<path d="M-20,4 Q-24,50 -18,92 M20,4 Q24,50 18,92" fill="none" stroke="${cos.straps}" stroke-width="9" stroke-linecap="round"/></g>`);
			if (cos.satchel) out.push(`<g transform="${g.bodyT}"${op}><path d="M22,2 L-30,104" stroke="${OL}" stroke-width="${f(8 + OW * 2)}" stroke-linecap="round"/><path d="M22,2 L-30,104" stroke="${cos.satchel}" stroke-width="8" stroke-linecap="round"/>
				<path d="M-52,94 L-14,94 L-12,132 Q-32,140 -54,132 Z" fill="${cos.satchel}" stroke="${OL}" stroke-width="${OW}" stroke-linejoin="round"/>
				<path d="M-53,94 L-13,94 L-16,112 Q-33,118 -50,112 Z" fill="rgba(0,0,0,.18)"/><rect x="-37" y="108" width="8" height="8" rx="2" fill="#D9B45A"/></g>`);
			return out.join('');
		},
		// over the white arms: sleeves (short or long) and wrist bands
		arms: (which = 'lr') => {      // 'l', 'r' or both: an arm drawn behind the body takes its sleeve along
			const out = [];
			const ds = [which.includes('l') && g.armLd, which.includes('r') && g.armRd].filter(Boolean);
			if (top && top.sleeve) {
				const col = top.shape === 'armor' ? (top.sleeveColor || top.color) : fillOf(top, '#EDE6D6');
				for (const d of ds) out.push(ctube(d, 0, top.sleeve, col, TW + 8));
			}
			if (cos.wrist) for (const d of ds) out.push(ctube(d, 0.78, 0.9, cos.wrist, TW + 5));
			if (cos.gloves) for (const d of ds) out.push(ctube(d, 0.82, 1, cos.gloves, TW + 7));
			return out.join('');
		},
		// props held in the hands (drawn before the hands, so the fingers close over them)
		propsBack: () => {
			const out = [];
			const rh = g.rh, lh = g.lh;
			if (cos.hold_r === 'spear') {
				const a = rad(8 + lean * 0.3);
				const top = [rh[0] + Math.sin(a) * 190, rh[1] - Math.cos(a) * 190], bot = [rh[0] - Math.sin(a) * 80, rh[1] + Math.cos(a) * 80];
				const nx = Math.cos(a), ny = Math.sin(a);
				out.push(`<g${op}><path d="M${f(bot[0])},${f(bot[1])} L${f(top[0])},${f(top[1])}" stroke="${OL}" stroke-width="${f(7 + OW * 2)}" stroke-linecap="round"/>
					<path d="M${f(bot[0])},${f(bot[1])} L${f(top[0])},${f(top[1])}" stroke="#8B5A2B" stroke-width="7" stroke-linecap="round"/>
					<path d="M${f(top[0] + Math.sin(a) * 46)},${f(top[1] - Math.cos(a) * 46)} L${f(top[0] + nx * 11)},${f(top[1] + ny * 11)} L${f(top[0] - nx * 11)},${f(top[1] - ny * 11)} Z" fill="#C9CED6" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/></g>`);
			}
			if (cos.hold_l === 'staff') {      // a walking stick: down to the ground, but never longer than a real stick
				const bottom = Math.min(396, lh[1] + 210);
				const d = `M${f(lh[0] + 4)},${f(lh[1] - 40)} L${f(lh[0] - 6)},${f(bottom)}`;
				out.push(`<path d="${d}" stroke="${OL}" stroke-width="${f(9 + OW * 2)}" stroke-linecap="round"${op}/><path d="${d}" stroke="#9A6B3C" stroke-width="9" stroke-linecap="round"${op}/>`);
			}
			return out.join('');
		},
		// a round shield on the left forearm, a map or a briefcase in the hands - in front of everything
		propsFront: () => {
			const out = [];
			if (cos.hold_r === 'map') {
				const m = g.rh;
				out.push(`<g transform="translate(${f(m[0] + 14)} ${f(m[1] - 30)}) rotate(-8)"${op}>
					<path d="M-26,-30 L-6,-24 L12,-32 L32,-26 L32,30 L12,24 L-6,32 L-26,26 Z" fill="#EAD9B0" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>
					<path d="M-6,-24 L-6,32 M12,-32 L12,24" stroke="rgba(0,0,0,.2)" stroke-width="2.5"/>
					<path d="M-18,-6 Q-4,-14 6,0 Q16,12 26,4" fill="none" stroke="#B3261E" stroke-width="2.5" stroke-dasharray="5 4"/><path d="M22,0 l6,6 m0,-6 l-6,6" stroke="#B3261E" stroke-width="3"/></g>`);
			}
			if (cos.hold_l === 'briefcase') {
				const b = g.lh;
				out.push(`<g${op}><path d="M${f(b[0] - 9)},${f(b[1] + 2)} L${f(b[0] - 9)},${f(b[1] - 7)} L${f(b[0] + 9)},${f(b[1] - 7)} L${f(b[0] + 9)},${f(b[1] + 2)}" fill="none" stroke="${OL}" stroke-width="5"/>
					<rect x="${f(b[0] - 30)}" y="${f(b[1] + 2)}" width="60" height="44" rx="6" fill="${cos.case || '#7A4A22'}" stroke="${OL}" stroke-width="${OW}"/>
					<path d="M${f(b[0] - 30)},${f(b[1] + 16)} L${f(b[0] + 30)},${f(b[1] + 16)}" stroke="rgba(0,0,0,.25)" stroke-width="3"/><rect x="${f(b[0] - 5)}" y="${f(b[1] + 12)}" width="10" height="8" rx="2" fill="#D9B45A"/></g>`);
			}
			for (const [side, name] of [['r', cos.hold_r], ['l', cos.hold_l]]) {
				const draw = PROPS[name];
				if (draw) out.push(`<g${op}>${draw(side === 'r' ? g.rh : g.lh, side === 'r' ? 1 : -1, OL, OW, t, cos)}</g>`);
			}
			if (cos.hold_l !== 'shield') return out.join('');
			const c0 = [g.lh[0] + 4, g.lh[1] - 18];
			return `<g transform="translate(${f(c0[0])} ${f(c0[1])})"${op}>
				<circle r="52" fill="${cos.shield || '#C08A2E'}" stroke="${OL}" stroke-width="${OW + 0.5}"/>
				<circle r="40" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="4"/><circle r="12" fill="#E7C06A" stroke="${OL}" stroke-width="3"/>
				<path d="M-30,-30 A42,42 0 0 1 10,-40" fill="none" stroke="#fff" stroke-width="5" opacity=".35" stroke-linecap="round"/></g>` + out.join('');
		},
	};
	k.hood = () => (top && top.shape === 'hoodie' && top.hood ? `<path d="M-60,40 A62,64 0 1 1 60,40 Z" fill="${fillOf(top, '#2F7FD0')}" stroke="${OL}" stroke-width="${OW}"/>` : '');
	return {k, defs: () => (defs.length ? `<defs>${[...new Set(defs)].join('')}</defs>` : '')};
};

// ---------------------------------------------------------------- body styles
// How the stick man himself is drawn (independent of the outfit). Each has a signature look that the plain
// stick man (the 'classic' avatar) wears: a headband, a bow tie + gloves, or wristbands + sneakers.
//   tw/ow = limb width / outline width, torso = body shape, limb = 'hose' (curved) or 'straight',
//   headShape = 'circle' | 'octagon', head = head size, hand = 'round' | 'glove' | 'hex', foot = 'oval' | 'bigshoe' | 'angular' | 'small' | 'round'
export const BODY_STYLES = {
	// black bendy noodle body, big white cartoon gloves with fingers + big shoes, green bow tie, pie eyes
	// (a light rim keeps it visible on dark backgrounds)
	rubberhose: {name: 'Rubber Hose Lite', limb: 'hose', tw: 12, ow: 0, line: '#111111', fill: '#111111', headFill: '#FFFFFF', torso: 'stick',
		hand: 'glove', foot: 'bigshoe', sign: ['bowtie'], acc: '#3DBE4F', rimOnDark: '#EDEDED', eyes: 'pie', head: 1.12, arm: 1.08, leg: 1.08,
		lines: '#111111', drops: true, headLine: 4, bow: 1.45},
	// glossy soft 3D: no dark outline, thick rounded limbs, tall capsule body, fists with fingers, hands on hips
	mascot: {name: 'Modern Mascot', tw: 18, ow: 1.2, line: '#AEB6C3', render: 'shaded', torso: 'capsule', hand: 'fist', handR: 12.5, foot: 'bean',
		head: 1.05, leg: 1.08, sign: ['headband'], soft: true, eyes: 'gloss'},
	// dark outline, tank top, high-top sneakers, wristbands, fists, running walk, speed lines
	sporty: {name: 'Sporty Action', tw: 11, ow: 3, torso: 'tank', hand: 'fist', handR: 10.5, foot: 'hightop', sign: ['headband'], sporty: true, speed: true, eyes: 'dot'},
	// chalky: hatching inside, rough double lines, strong wobble
	scribble: {name: 'Scribble Hand-Drawn', tw: 12, ow: 3, line: '#1A1715', render: 'sketch', torso: 'box', hatch: true, sign: ['headband'], wobble: 8,
		handR: 11, footR: [16, 9], eyes: 'dot', drops: true},
	// flat white, no outline, straight pieces with gaps at the joints, many-sided head, hex hands, wedge feet
	geometric: {name: 'Geometric Angular', tw: 13, ow: 0, flat: true, limb: 'straight', seg: true, headShape: 'octagon', hand: 'hex', foot: 'angular', torso: 'angular',
		sign: ['headband'], eyes: 'dot'},
	// flat white, very thick limbs with a grey side, bigger head
	bold: {name: 'Bold Thick-Line', tw: 22, ow: 0, flat: true, shade: '#C9CCD3', torso: 'box', handR: 14, foot: 'round', footR: [20, 12], head: 1.1, sign: ['headband'], eyes: 'dot'},
	// flat white thin lines, narrow body, tiny hands, long legs
	slim: {name: 'Slim Minimal', tw: 7, ow: 0, flat: true, torso: 'slim', handR: 8, foot: 'small', arm: 1.05, leg: 1.1, sign: ['headband'], eyes: 'dot'},
	// Stickman Kino (MIT): one even line for body, arms and legs, a small hollow head with a side-view dot face
	kino: {name: 'Kino Line', stick: true, tw: 10.5, head: 0.74, arm: 1.1, leg: 1.16, eyes: 'kino', sign: []},
	// chubby: short legs, pear body, big round hands and feet, big head
	rounded: {name: 'Rounded Cute', tw: 20, ow: 2.4, line: '#26262B', torso: 'blob', handR: 14, foot: 'round', footR: [21, 13], head: 1.18, arm: 0.84, leg: 0.7,
		sign: ['headband'], eyes: 'dot', drops: true},
};

// How each body style stands, points, walks and jumps (its own body language, as in its reference sheet).
// These replace the shared poses / moves of the same name while that style is drawn.
//   grip: {l, r} = where a hand goes by itself: 'hip' (hands on hips), 'belly' (hand on the belly), 'clasp' (both hands together)
const HIPS = [-38, 105];
const GRIPS = {
	hips: {l_arm: HIPS, r_arm: [38, -105], grip: {l: 'hip', r: 'hip'}},
	clasp: {l_arm: [-8, 46], r_arm: [8, -46], grip: {l: 'clasp', r: 'clasp'}},
};
const pointPose = (r_arm, l, mouth = 'smile') => ({r_arm, l_arm: l === 'hip' ? HIPS : [-20, 80], grip: {l}, l_leg: [-6, 0], r_leg: [7, 0], body: -3, head: -4,
	face: {eyes: 'open', brows: 'up', mouth}});
const jumpSet = (l_arm, r_arm, l_leg, r_leg, face) => ({
	poses: {happy: {l_arm, r_arm, l_leg: [-8, 0], r_leg: [8, 0], face}},
	moves: {jump: {base: 'happy', loop: true, duration: 0.7, face,
		keys: [{t: 0, y: 8, l_leg: [-10, 20], r_leg: [10, -20]}, {t: 0.35, y: -60, l_leg, r_leg}]}},
});
// the walk with the style's own arm swing (fwd / back = arm angle + elbow bend), legs from the shared walk
// (as in the reference sheets each arm swings on its own side, so it never sweeps across the body)
const walkArms = (fwd, back, mid, extra = {}) => (walk) => {
	const half = (a) => [a[0] * 0.3, a[1]];
	return {...walk, keys: (walk.keys || []).map((k, i) => ({...k, ...extra,
		l_arm: [back, mid, half(fwd), mid][i % 4], r_arm: [fwd, mid, half(back), mid][i % 4]}))};
};
const HAPPY = {eyes: 'happy', brows: 'up', mouth: 'big'};
const HAPPY_SMILE = {eyes: 'happy', brows: 'up', mouth: 'grin'};
const GLAD = {eyes: 'open', brows: 'up', mouth: 'grin'};
const STYLE_MOVES = {
	rubberhose: {poses: {stand: {l_arm: [-12, 8], r_arm: [12, -8], l_leg: [-6, 0], r_leg: [6, 0], face: {eyes: 'open', brows: 'up', mouth: 'smile'}},
		point: pointPose([72, 34], 'hip', 'big')},
		walk: walkArms([30, 40], [-34, -20], [0, 10]), jump: jumpSet([-128, -52], [128, 52], [-78, 88], [36, 50], HAPPY)},
	mascot: {poses: {stand: GRIPS.hips, point: pointPose([52, 122], 'hip')},
		walk: walkArms([16, 34], [-28, 6], [-6, 14]), jump: jumpSet([-72, -98], [165, 8], [-62, 84], [14, 12], HAPPY_SMILE)},
	sporty: {poses: {stand: GRIPS.hips, point: pointPose([108, 24], 'hip')},
		walk: walkArms([42, 80], [-40, 32], [0, 56], {body: -6}), jump: jumpSet([-36, 62], [150, 22], [28, -80], [52, -92], GLAD)},
	scribble: {poses: {stand: GRIPS.clasp, point: pointPose([90, 4], 'belly', 'big')},
		walk: walkArms([16, 24], [-26, 8], [-4, 12]), jump: jumpSet([-150, -6], [150, 6], [-8, 12], [38, 62], HAPPY)},
	geometric: {poses: {stand: GRIPS.clasp, point: pointPose([70, 56], 'hip')},
		walk: walkArms([18, 26], [-26, 10], [-4, 12]), jump: jumpSet([-128, -46], [128, 46], [-2, 4], [72, -64], GLAD)},
	bold: {poses: {stand: GRIPS.clasp, point: pointPose([64, 62], 'belly')},
		walk: walkArms([16, 28], [-26, 8], [-4, 12]), jump: jumpSet([-150, -12], [150, 12], [-42, 74], [14, -6], GLAD)},
	slim: {poses: {stand: GRIPS.clasp, point: pointPose([60, 70], 'belly')},
		walk: walkArms([20, 22], [-28, 8], [-4, 10]), jump: jumpSet([-132, -4], [142, 4], [-52, 84], [10, 4], GLAD)},
	rounded: {poses: {stand: GRIPS.clasp, point: pointPose([72, 50], 'hip', 'big')},
		walk: walkArms([18, 30], [-28, 10], [-4, 14]), jump: jumpSet([-140, -32], [140, 32], [-46, 78], [42, -72], HAPPY)},
};
// the stickman.json data seen through a body style (cached per data object)
const styledCache = new WeakMap();
const styledData = (data, key) => {
	const set = STYLE_MOVES[key];
	if (!set) return data;
	let m = styledCache.get(data);
	if (!m) styledCache.set(data, (m = {}));
	if (!m[key]) {
		const jump = set.jump || {};
		const moves = {...(data.moves || {}), ...(jump.moves || {})};
		if (set.walk && moves.walk) moves.walk = set.walk(moves.walk);
		m[key] = {...data, poses: {...(data.poses || {}), ...(set.poses || {}), ...(jump.poses || {})}, moves};
	}
	return m[key];
};
const TORSOS = {     // body-local paths (neck at 0,0, hip at 0,108) and where the arms / legs join
	normal: {d: 'M-27,6 Q0,-6 27,6 Q32,60 27,112 Q0,120 -27,112 Q-32,60 -27,6 Z', arm: 21, leg: 12},
	box: {d: 'M-30,2 Q-40,2 -40,22 L-40,96 Q-40,116 -20,116 L20,116 Q40,116 40,96 L40,22 Q40,2 30,2 Q0,-6 -30,2 Z', arm: 43, leg: 12},
	stick: {d: 'M-7,0 Q0,-3 7,0 L6.5,112 Q0,117 -6.5,112 Z', arm: 4, leg: 4},
	pill: {d: 'M-30,8 Q0,-10 30,8 Q38,62 32,110 Q0,124 -32,110 Q-38,62 -30,8 Z', arm: 33, leg: 14},
	angular: {d: 'M-26,0 L26,0 L36,14 L32,112 L-32,112 L-36,14 Z', arm: 35, leg: 14},
	slim: {d: 'M-13,4 Q0,-2 13,4 L13,108 Q0,112 -13,108 Z', arm: 15, leg: 7},
	blob: {d: 'M-24,4 Q0,-8 24,4 Q46,64 38,104 Q30,120 0,120 Q-30,120 -38,104 Q-46,64 -24,4 Z', arm: 30, leg: 16},
	capsule: {d: 'M-22,-2 Q-37,0 -36,24 L-34,96 Q-33,117 -14,117 L14,117 Q33,117 34,96 L36,24 Q37,0 22,-2 Q0,-6 -22,-2 Z', arm: 30, leg: 15},
	tank: {d: 'M-30,0 L-18,-3 Q0,9 18,-3 L30,0 Q40,3 41,14 Q32,26 36,44 L39,114 L-39,114 L-36,44 Q-32,26 -41,14 Q-40,3 -30,0 Z', arm: 36, leg: 15},
};

// ---------------------------------------------------------------- walking / running cycle (body styles)
// one cycle = two steps. Each foot: stance (planted, sliding back under the hip) then swing (lifted, forward).
// Returns arm angles, hip height, body lean and the foot positions (x relative to its hip, y on the floor).
const GAITS = {
	// a person's walk: the standing leg nearly straight (hips high, base 3), a long step, the swinging foot lifted
	// just enough, a small bob and a slight lean into the walk - not the crouched, both-knees-bent shuffle
	walk: {dur: 1.05, stride: 66, lift: 24, stance: 0.62, bob: 3.5, base: 3, swing: 28, lean: -4},
	run: {dur: 0.64, stride: 60, lift: 40, stance: 0.4, bob: 9, base: 16, swing: 40, lean: -9},
};
const FLOOR_Y = 393;
// cycles = how many walking cycles so far (from the distance travelled); otherwise the clock drives it (walking on the spot)
export const gaitStep = (kind, leg = 1) => { const g = GAITS[kind] || GAITS.walk; return 2 * g.stride * leg / g.stance; };   // ground covered per cycle (viewBox units)
const gaitCycle = (kind, t, BS, cycles) => {
	const g = GAITS[kind];
	const LL = BS.leg || 1;
	const c = cycles ?? t / g.dur;
	const phase = ((c % 1) + 1) % 1;
	const footAt = (p) => {
		const S = g.stride * LL;
		if (p < g.stance) return {x: S * (1 - 2 * (p / g.stance)), y: FLOOR_Y, up: 0};
		const u = (p - g.stance) / (1 - g.stance);
		const e = smooth(u);
		const lift = g.lift * Math.sin(Math.PI * Math.pow(u, 0.8));
		return {x: -S + 2 * S * e, y: FLOOR_Y - lift, up: lift};
	};
	const lf = footAt(phase), rf = footAt((phase + 0.5) % 1);
	// hips: highest when one leg is straight under the body (mid-stance), lowest when both feet are down
	const mid = g.stance / 2;
	const y = g.base - g.bob * Math.cos(4 * Math.PI * (phase - mid)) * (kind === 'run' ? -1 : 1);
	// arms swing against the legs (left arm forward while the left foot is back), elbows bend forward;
	// an arm that swings across the body is drawn behind it (see drawAvatar)
	const sw = g.swing * (BS.sporty && kind === 'walk' ? 1.25 : 1);
	const arm = (footX) => {
		const a = -sw * (footX / (g.stride * LL));
		return [a, kind === 'run' ? 80 + a * 0.3 : (BS.sporty ? 34 : 10) + Math.max(0, a) * 1.1];
	};
	return {l_arm: arm(lf.x), r_arm: arm(rf.x), y, body: g.lean + (BS.sporty && kind === 'walk' ? -4 : 0), feet: {l: lf, r: rf}};
};

// two-bone reach: the elbow / knee for a hand / foot target (lengths kept); bend picks which side the joint goes
const ik2 = (S, T, U, Dn, bendSide) => {
	const dx = T[0] - S[0], dy = T[1] - S[1];
	const d0 = Math.hypot(dx, dy) || 1e-6;
	const d = Math.min(d0, U + Dn - 0.5);
	const base = Math.atan2(dy, dx);
	const a = Math.acos(Math.max(-1, Math.min(1, (U * U + d * d - Dn * Dn) / (2 * U * d))));
	const ang = base + bendSide * a;
	const e = [S[0] + Math.cos(ang) * U, S[1] + Math.sin(ang) * U];
	const h = [S[0] + dx * d / d0, S[1] + dy * d / d0];
	return {e, h};
};

// ---------------------------------------------------------------- the avatar

/**
 * opts: data (stickman.json), avatar (name or object), pose (name), t (s), k (0-1 pose blend from rest),
 * draw (0-1 line draw-on), ink, accent, face (head fill), talking (bool), holdSrc (image url for 'hold'),
 * style: 'outline' (default: white body with a thin dark outline, like whiteboard explainers) or 'chalk' (single light lines).
 */
export const drawAvatar = (opts) => {
	const {data, t = 0, k = 1, draw = 1, talking = false, holdSrc} = opts;
	const av = typeof opts.avatar === 'string' ? (data.avatars || {})[opts.avatar] || {} : opts.avatar || {};
	const parts = new Set(av.parts || []);
	const sil = !!av.silhouette;
	const BS = BODY_STYLES[opts.style] || null;          // one of the 8 body styles (else the old 'outline' / 'chalk')
	const HUM = !!BS || !!opts.human;                    // human motion: planted feet, knees / elbows that bend the right way
	const outlined = ((opts.style || 'outline') === 'outline' || (!!BS && !BS.stick)) && !sil;   // stick styles: single lines
	// the plain stick man wears the body style's signature look (headband, bow tie + gloves, wristbands + sneakers)
	const plain = !!BS && !av.costume && (opts.avatar === 'classic' || !opts.avatar || av === (data.avatars || {}).classic);
	if (plain) {
		parts.delete('scarf');
		for (const sp of BS.sign || []) parts.add(sp);
	}
	// drawing looks: 'shaded' = soft 3D-like gradients, 'sketch' = rough hand-drawn lines that wobble a little
	const render = av.render || (BS && BS.render);
	const shaded = outlined && render === 'shaded';
	const sketch = outlined && render === 'sketch';
	const darkBg = opts.dark !== false;                   // the video background (light backgrounds need outlines)
	const flat = !!(BS && BS.flat && darkBg);             // flat white shapes, no outline (as in the reference images)
	const OL = av.line || (BS && BS.line) || (sketch ? '#2A2420' : shaded ? '#3B4250' : '#1B1B1F');   // outline colour (outline style)
	const FILL = av.fill || (BS && BS.hatch ? 'url(#hatch)' : BS && BS.fill) || (shaded ? '#EEF1F6' : flat ? '#F7F7F4' : '#FFFFFF');   // body colour
	const ink = outlined ? (BS && BS.soft ? '#1E2230' : OL) : opts.ink || av.ink || (sil ? '#0B0B10' : '#F2EAD8');   // face lines stay dark
	// an outfit (costume rig / own body look) keeps its own colours; the classic avatars follow the video's accent
	const outfit = !!(av.costume || av.torso || av.render);
	const acc = (plain && BS.acc) || (outfit && av.accent) || opts.accent || av.accent || '#F2B33D';
	const faceFill = sil || av.head_shape === 'filled' ? ink : shaded ? 'url(#shHead)' : outlined ? ((BS && BS.headFill) || FILL) : (av.face || opts.face || 'none');

	// pose (+ idle life when standing still)
	const D = BS ? styledData(data, opts.style) : data;   // the body style's own stand / point / walk / jump
	// a gesture lands with a small overshoot and settles (human motion), instead of stopping dead
	const backOut = (u) => { const c1 = 1.15, v = Math.max(0, Math.min(1, u)) - 1; return 1 + (c1 + 1) * v * v * v + c1 * v * v; };
	const ease = (u) => (HUM ? backOut(smooth(Math.max(0, Math.min(1, u))) * 0.35 + Math.max(0, Math.min(1, u)) * 0.65) : smooth(Math.max(0, u)));
	let target = poseAt(D, opts.pose || 'stand', t, HUM);
	if (opts.from && opts.from !== opts.pose && (opts.blend ?? 1) < 1) {   // gesture change: blend from the last one
		const face = target.face;
		target = {...mix(poseAt(D, opts.from, t, HUM), target, ease(opts.blend)), face, prop: target.prop};
	}
	const P = mix({...REST}, target, k);
	P.face = target.face || {};
	P.prop = target.prop;
	const moving = !!(D.moves || {})[opts.pose];
	const bl = smooth(Math.max(0, Math.min(1, opts.blend ?? 1)));
	const changing = !!(opts.from && opts.from !== opts.pose);
	const kk = Math.max(0, Math.min(1, k));
	// body styles walk / run like a person: each foot stays planted on the ground and pushes back, then lifts and
	// swings forward; the hips dip and rise with every step; the arms swing against the legs
	const gaitOf = (n) => (HUM && (n === 'walk' || n === 'run') ? n : null);
	const gaitName = gaitOf(opts.pose) || (changing ? gaitOf(opts.from) : null);
	const gw = !gaitName ? 0 : (gaitOf(opts.pose) ? (changing ? bl : 1) : 1 - bl) * kk;
	const G = gw > 0 ? gaitCycle(gaitName, t, BS || {}, opts.gaitCycles) : null;
	// side-on poses (walking, sitting, kneeling, leaping...): the WHOLE figure turns toward the way he faces -
	// legs from the middle of the hips, a narrower body and shoulders, the face turned, both feet pointing forward
	const isSide = (n) => !!(((D.poses || {})[n] || (D.moves || {})[n] || {}).side);
	const sideW = HUM ? (isSide(opts.pose) ? (changing ? bl : 1) : 0) + (changing && isSide(opts.from) ? 1 - bl : 0) : 0;
	const turnW = HUM ? Math.min(1, Math.max(gw, sideW)) : 0;
	const narrow = 1 - 0.36 * turnW;                     // body / shoulder width when turned
	if (G) {
		const mixA = (a, b) => [lerp(a[0], b[0], gw), lerp(a[1], b[1], gw)];
		P.l_arm = mixA(P.l_arm, G.l_arm);
		P.r_arm = mixA(P.r_arm, G.r_arm);
		P.y = lerp(P.y || 0, G.y, gw);
		P.body = lerp(P.body || 0, G.body, gw);
	}
	const look = opts.look || null;                      // {x, y} -1..1: where he looks (eyes + face turn, head tilts)
	if (look) P.head = (P.head || 0) - (look.x || 0) * 6 + (look.y || 0) * 3;
	const beat = Math.max(0, Math.min(1, opts.beat || 0));      // 0..1 pulse on each spoken word
	if (beat > 0 && !moving && !/^(point|walk|run|sit)$/.test(opts.pose || '')) {
		P.r_arm = [P.r_arm[0] + beat * 7, P.r_arm[1] + beat * 18];
		P.l_arm = [P.l_arm[0] - beat * 4, P.l_arm[1] - beat * 10];
		P.head = (P.head || 0) + beat * 3;
	}
	const breathe = Math.sin(t * 2.4) * 2.2;
	const sway = moving ? 0 : Math.sin(t * 2.1) * 2.5;
	const lean = (P.body || 0) + (av.hunch || 0);
	const headScale = (av.head || 1) * ((BS && BS.head) || 1);
	const R = 48 * headScale;

	// skeleton
	const AL = (BS && BS.arm) || 1, LL = (BS && BS.leg) || 1;   // limb length of the body style
	const shift = HUM && !moving && !G && Math.abs(P.y || 0) < 1 ? Math.sin(t * 0.75) * 3.5 : 0;
	const hip = [100 + shift, 250 + (P.y || 0) * LL + (1 - LL) * 144];     // hip drop (sitting, kneeling) scales with the legs
	const up = (len) => dir(180 + lean, len);                // along the body, upwards
	const neck = add(hip, up(108 + (moving ? 0 : breathe * 0.4)));
	const shoulder = add(neck, dir(lean, 14));
	const headC = add(neck, up(R + 4));
	const limb = (start, ang, bend, l1, l2, bodyLean) => {
		const a1 = ang + bodyLean;
		const e = add(start, dir(a1, l1));
		const h = add(e, dir(a1 + bend, l2));
		return {e, h};
	};
	const la = limb(shoulder, P.l_arm[0] - sway, P.l_arm[1], 62 * AL, 58 * AL, lean);
	const ra = limb(shoulder, P.r_arm[0] + sway, P.r_arm[1], 62 * AL, 58 * AL, lean);
	const ll = limb(hip, P.l_leg[0], P.l_leg[1], 74 * LL, 70 * LL, 0);
	const rl = limb(hip, P.r_leg[0], P.r_leg[1], 74 * LL, 70 * LL, 0);

	// rubber-hose limb: a curve that passes through the elbow / knee
	// human motion: upper arm + forearm (thigh + shin) are two straight bones meeting at a real elbow / knee;
	// only the rubber-hose style keeps its bendy noodle limbs
	const bones = (BS && BS.limb === 'straight') || (HUM && !(BS && BS.limb === 'hose'));
	const hose = (a, m, b) => {
		if (bones) return `M${f(a[0])},${f(a[1])} L${f(m[0])},${f(m[1])} L${f(b[0])},${f(b[1])}`;
		const cx = 2 * m[0] - (a[0] + b[0]) / 2;
		const cy = 2 * m[1] - (a[1] + b[1]) / 2;
		return `M${f(a[0])},${f(a[1])} Q${f(cx)},${f(cy)} ${f(b[0])},${f(b[1])}`;
	};
	const W = BS && BS.stick ? BS.tw : sil ? 15 : 12.5;
	const dash = draw < 1 ? ` pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${f(1 - draw)}"` : '';
	const line = (d, w = W) => `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${dash}/>`;
	const c = {ink, acc, sw: Math.sin(t * 6), bow: BS && BS.bow, kHat: av.hat || acc, faceDx: BS && BS.stick ? 17 : 0, dark: outlined ? '#1E1E22' : ink, hairInk: outlined ? '#2A2420' : ink, crest: (av.costume && av.costume.crest) || '#C0262D', metal: '#C9973F', metalDark: '#8C6420',
		straw: '#E2BE72', band: (av.costume && av.costume.band) || '#2F6FA3', hat: '#9C7446', hatBand: '#5B3A1E'};
	const op = draw < 1 ? ` opacity="${f(Math.min(1, draw * 1.4))}"` : '';
	const bodyT = `translate(${f(neck[0])} ${f(neck[1])}) rotate(${f(-lean)})${turnW > 0.01 ? ` scale(${f(narrow * 100) / 100} 1)` : ''}`;
	const headT = `translate(${f(headC[0])} ${f(headC[1])}) rotate(${f(-(P.head || 0) - lean * 0.5)}) scale(${f(headScale * 100) / 100})`;
	let foot = (p, side) => `<ellipse cx="${f(p[0] + side * 7)}" cy="${f(p[1] + 1)}" rx="14" ry="7.5" fill="${ink}"${op}/>`;
	let hand = (p) => `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${sil ? 10 : 8.5}" fill="${ink}"${op}/>`;
	// outline style: limbs are white tubes with a thin dark outline, round white hands, small oval shoes
	// flat styles on a dark background: a thin dark edge (invisible on the background, it separates an arm from the body)
	const OW = BS ? (flat ? 2 : BS.flat ? 2.6 : BS.rimOnDark && darkBg ? 1.8 : BS.ow) : 3.6;
	const OLc = BS && BS.rimOnDark && darkBg ? BS.rimOnDark : OL;      // outline colour of the limbs
	const TW = BS ? BS.tw : 10;
	const J = BS && BS.limb === 'straight' ? ' stroke-linecap="butt" stroke-linejoin="miter"' : ' stroke-linecap="round" stroke-linejoin="round"';
	const tube = (d) => (OW > 0 ? `<path d="${d}" fill="none" stroke="${OLc}" stroke-width="${f(TW + OW * 2)}"${J}${dash}/>` : '')
		+ (BS && BS.shade ? `<path d="${d}" fill="none" stroke="${BS.shade}" stroke-width="${TW}"${J}${OW > 0 ? op : dash}/>`
			+ `<path d="${d}" fill="none" stroke="${FILL}" stroke-width="${f(TW * 0.62)}"${J} transform="translate(${f(-TW * 0.17)} 0)"${op}/>`
			: `<path d="${d}" fill="none" stroke="${FILL}" stroke-width="${TW}"${J}${OW > 0 ? op : dash}/>`)
		+ (shaded ? `<path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="${f(TW * 0.38)}" stroke-linecap="round" stroke-linejoin="round" transform="translate(-2.2 -1)" opacity=".95"${op}/>` : '');
	if (outlined) {
		foot = (p, side) => `<ellipse cx="${f(p[0] + side * 6)}" cy="${f(p[1] - 1)}" rx="15" ry="8" fill="${FILL}" stroke="${OL}" stroke-width="${OW}"${op}/>`;
		hand = (p) => `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="9.5" fill="${shaded ? 'url(#shHead)' : FILL}" stroke="${OL}" stroke-width="${OW}"${op}/>`;
	}
	if (BS && BS.stick) {     // Kino: the lines just end, rounded (no hand or foot shapes)
		hand = () => '';
		foot = () => '';
	} else if (BS) {
		const LW = flat ? 2 : Math.max(BS.soft ? 1.2 : 2.6, OW || 3);   // outline of hands / feet
		const white = BS.headFill || (shaded ? 'url(#shHead)' : BS.hatch ? 'url(#hatch)' : FILL);
		const handR = BS.handR || 9.5;
		const hw = white === FILL && BS.fill ? '#FFFFFF' : white;
		const crease = BS.soft ? '#9AA3B2' : OL;
		// in the hand's own frame: +x runs along the forearm, away from the elbow; the left hand is mirrored
		const shapes = {
			glove: (g) => {              // rubber-hose cartoon glove: puffy, with a rolled cuff, fingers and a thumb
				const st = `fill="#FFFFFF" stroke="#111111" stroke-width="3.2" stroke-linejoin="round"`;
				const cuff = `<rect x="-5" y="-12" width="11" height="24" rx="5" ${st}/>`;
				if (g === 'point') return `<rect x="14" y="-11" width="25" height="10" rx="5" ${st}/><circle cx="14" cy="1" r="13.5" ${st}/>
					<path d="M18,4 Q24,7 19,11" fill="none" stroke="#111111" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="9" cy="-12" rx="7.5" ry="5" ${st}/>${cuff}`;
				if (g === 'fist') return `<circle cx="16" cy="0" r="15" ${st}/><path d="M22,-9 Q30,-6 25,-1 M24,-1 Q32,3 25,8" fill="none" stroke="#111111" stroke-width="2.4" stroke-linecap="round"/>
					<ellipse cx="11" cy="-13" rx="8" ry="5.5" ${st}/>${cuff}`;
				return `<ellipse cx="27" cy="-9" rx="8" ry="5.6" ${st}/><ellipse cx="30" cy="0" rx="8.5" ry="5.8" ${st}/><ellipse cx="27" cy="9" rx="8" ry="5.6" ${st}/>
					<circle cx="16" cy="0" r="14" ${st}/><ellipse cx="11" cy="-14" rx="5.6" ry="8" transform="rotate(-30 11 -14)" ${st}/>${cuff}`;
			},
			fist: (g) => {               // a fist with curled-finger lines and a thumb; one finger out to point
				const r = handR, st = `fill="${hw}" stroke="${OL}" stroke-width="${LW}"`;
				const lines = `<path d="M${f(r * 1.25)},${f(-r * 0.62)} Q${f(r * 1.7)},${f(-r * 0.3)} ${f(r * 1.3)},${f(-r * 0.02)} M${f(r * 1.3)},${f(-r * 0.02)} Q${f(r * 1.72)},${f(r * 0.32)} ${f(r * 1.25)},${f(r * 0.62)}" fill="none" stroke="${crease}" stroke-width="${f(Math.max(1.6, r * 0.16))}" stroke-linecap="round"/>`;
				const thumb = `<path d="M${f(r * 0.1)},${f(-r * 0.62)} Q${f(r * 0.7)},${f(-r * 1.02)} ${f(r * 1.2)},${f(-r * 0.5)}" fill="none" stroke="${crease}" stroke-width="${f(Math.max(1.6, r * 0.16))}" stroke-linecap="round"/>`;
				if (g === 'point') return `<rect x="${f(r * 0.9)}" y="${f(-r * 0.92)}" width="${f(r * 1.9)}" height="${f(r * 0.72)}" rx="${f(r * 0.36)}" ${st}/>
					<circle cx="${f(r * 0.7)}" cy="0" r="${f(r * 0.95)}" ${st}/>${thumb}`;
				return `<circle cx="${f(r * 0.75)}" cy="0" r="${r}" ${st}/>${g === 'fist' ? lines : ''}${thumb}`;
			},
			hex: (g) => {
				const st = `fill="${white}" stroke="${OL}" stroke-width="${LW}" stroke-linejoin="miter"`;
				if (g === 'point') return `<path d="M-6,-9 L6,-10 L24,-1 L6,9 L-6,8 L-11,0 Z" ${st}/>`;
				return `<path d="${[0, 1, 2, 3, 4, 5].map((i) => { const a = Math.PI / 3 * i + Math.PI / 6; return `${i ? 'L' : 'M'}${f(4 + Math.cos(a) * 11)},${f(Math.sin(a) * 11)}`; }).join(' ')} Z" ${st}/>`;
			},
			ball: (g) => {
				const st = `fill="${hw}" stroke="${OL}" stroke-width="${LW}"`;
				return (g === 'point' ? `<rect x="${f(handR * 0.3)}" y="${f(-handR * 0.95)}" width="${f(handR * 1.5)}" height="${f(Math.max(5, handR * 0.62))}" rx="${f(Math.max(2.5, handR * 0.31))}" ${st}/>` : '')
					+ `<circle cx="0" cy="0" r="${handR}" ${st}/>`;
			},
		};
		const shape = shapes[BS.hand] || shapes.ball;
		const hs = BS.hand === 'glove' ? 1.3 : 1;
		hand = (p, e, sd) => {
			const a = e ? Math.atan2(p[1] - e[1], p[0] - e[0]) * 180 / Math.PI : 90;
			return `<g transform="translate(${f(p[0])} ${f(p[1])}) rotate(${f(a)})${hs !== 1 ? ` scale(${hs})` : ''}${sd === 'l' ? ' scale(1 -1)' : ''}"${op}>${shape(gesture(sd))}</g>`;
		};
		if (BS.foot === 'bigshoe') {
			foot = (p, side) => `<g transform="translate(${f(p[0])} ${f(p[1] - 2)}) scale(${f(side * 1.2)} 1.2)"${op}><path d="M-16,-15 Q0,-26 22,-16 Q40,-8 34,5 L-17,5 Q-26,-4 -16,-15 Z" fill="#FFFFFF" stroke="#111111" stroke-width="3.6" stroke-linejoin="round"/>
				<path d="M-18,-1 L35,-1" stroke="#111111" stroke-width="2.6"/><path d="M8,-17 Q18,-15 24,-9" fill="none" stroke="#111111" stroke-width="2.2" stroke-linecap="round"/></g>`;
		} else if (BS.foot === 'angular') {
			foot = (p, side) => `<path d="M${f(p[0] - 8)},${f(p[1] - 9)} L${f(p[0] + side * 20)},${f(p[1] - 6)} L${f(p[0] + side * 22)},${f(p[1] + 5)} L${f(p[0] - 10)},${f(p[1] + 5)} Z" fill="${white}" stroke="${OL}" stroke-width="${LW}" stroke-linejoin="miter"${op}/>`;
		} else if (BS.foot === 'hightop') {     // sporty high-top sneaker: white with an orange heel, a stripe and laces
			foot = (p, side) => {
				const x = p[0] + side * 6, y = p[1];
				return `<g${op} transform="translate(${f(x)} ${f(y)}) scale(1.45) translate(${f(-x)} ${f(-y)})"><path d="M${f(x - side * 14)},${f(y - 18)} L${f(x - side * 14)},${f(y + 4)} L${f(x + side * 22)},${f(y + 4)} Q${f(x + side * 24)},${f(y - 6)} ${f(x + side * 8)},${f(y - 8)} L${f(x + side * 2)},${f(y - 18)} Z"
					fill="#FFFFFF" stroke="${OL}" stroke-width="${LW}" stroke-linejoin="round"/>
					<path d="M${f(x - side * 14)},${f(y - 18)} L${f(x - side * 14)},${f(y + 2)} L${f(x - side * 5)},${f(y + 2)} L${f(x - side * 5)},${f(y - 14)} Z" fill="${acc}"/>
					<path d="M${f(x - side * 15)},${f(y + 4)} L${f(x + side * 23)},${f(y + 4)}" stroke="${OL}" stroke-width="5"/>
					<path d="M${f(x + side * 1)},${f(y - 13)} l${f(side * 6)},2 M${f(x + side * 3)},${f(y - 9)} l${f(side * 6)},2" stroke="${OL}" stroke-width="2"/>
					<path d="M${f(x)},${f(y - 2)} Q${f(x + side * 8)},${f(y - 6)} ${f(x + side * 16)},${f(y - 2)}" fill="none" stroke="${acc}" stroke-width="3.5"/></g>`;
			};
		} else {
			const [rx, ry] = BS.footR || (BS.foot === 'small' ? [11, 6] : BS.foot === 'round' ? [17, 10] : BS.foot === 'bean' ? [20, 11] : [15, 8]);
			foot = (p, side) => `<ellipse cx="${f(p[0] + side * 6)}" cy="${f(p[1] - 1)}" rx="${rx}" ry="${ry}" fill="${white}" stroke="${OL}" stroke-width="${LW}"${op}/>`;
		}
	}

	// face
	let face = '';
	if (!sil && av.head_shape !== 'filled') {
		const fc = P.face || {};
		const blinking = (fc.eyes || 'open') === 'open' && (t % 3.7) > 3.58;
		const own = BS && BS.eyes;                       // the body style's own eyes / smile
		// a side-view (Kino) face: every expression sits on the side he faces, a little smaller
		const side = (svg) => (BS && BS.stick && svg ? `<g transform="translate(17 1) scale(.72)">${svg}</g>` : svg);
		const ownEyes = own && !blinking && (fc.eyes || 'open') === 'open';
		const eyes = ownEyes ? STYLE_EYES[own](ink) : side((EYES[fc.eyes] || EYES.open)(ink, blinking));
		const brows = own && STYLE_BROWS[own] && (fc.brows || 'none') === 'none' ? STYLE_BROWS[own](ink) : side((BROWS[fc.brows] || BROWS.none)(ink));
		const open = talking ? Math.abs(Math.sin(t * 17)) : 0;
		const ownMouth = !(talking && open > 0.15) && own && (fc.mouth || 'smile') === 'smile';
		const mouth = ownMouth ? STYLE_SMILE[own](ink) : side(talking && open > 0.15 ? MOUTHS.talk(ink, open) : (MOUTHS[fc.mouth] || MOUTHS.smile)(ink));
		face = eyes + brows + mouth;
	}
	const pick = (lib) => Object.keys(lib).filter((p) => parts.has(p)).map((p) => lib[p](c)).join('');

	// limbs start at the sides of the body (outline style) instead of its centre line
	const side = (p, d) => add(p, [Math.cos(rad(lean)) * d, -Math.sin(rad(lean)) * d]);
	const TORSO = TORSOS[av.torso === 'box' ? 'box' : (BS && BS.torso) || 'normal'] || TORSOS.normal;
	const armX = TORSO.arm * (turnW > 0.01 ? narrow : 1);    // the arms come out of the sides of the body shape
	const armL = outlined ? side(add(shoulder, dir(lean, 5)), -armX) : shoulder;
	const armR = outlined ? side(add(shoulder, dir(lean, 5)), armX) : shoulder;
	const hipL = outlined ? side(hip, -TORSO.leg) : hip;
	const hipR = outlined ? side(hip, TORSO.leg) : hip;
	const aimArm = (q, name, w = 1) => {     // the pointing pose aims the right arm at opts.aim
		if (!opts.aim || !/^point$/.test(name || '')) return;
		const a = Math.atan2(opts.aim.x - armR[0], opts.aim.y - armR[1]) * 180 / Math.PI;
		q.r_arm = [lerp(q.r_arm[0], a - lean - 3, w), lerp(q.r_arm[1], 6, w)];
	};
	if (HUM) aimArm(P, opts.pose, changing ? ease(opts.blend) : 1);
	if (HUM) {     // arms / legs swing from the real shoulders and hips (wide bodies: arms hang at the sides)
		// side-on poses (sitting, kneeling, leaping...): both legs come from the middle of the hips, like walking
		if (sideW > 0) for (const H of [hipL, hipR]) { H[0] = lerp(H[0], hip[0], sideW * 0.85); H[1] = lerp(H[1], hip[1], sideW * 0.85); }
		Object.assign(la, limb(armL, P.l_arm[0] - sway, P.l_arm[1], 62 * AL, 58 * AL, lean));
		Object.assign(ra, limb(armR, P.r_arm[0] + sway, P.r_arm[1], 62 * AL, 58 * AL, lean));
		Object.assign(ll, limb(hipL, P.l_leg[0], P.l_leg[1], 74 * LL, 70 * LL, 0));
		Object.assign(rl, limb(hipR, P.r_leg[0], P.r_leg[1], 74 * LL, 70 * LL, 0));
		if (G) {
			const step = (L, H, ft) => {
				const T = [lerp(L.h[0], H[0] + ft.x, gw), lerp(L.h[1], ft.y, gw)];
				Object.assign(L, ik2(H, T, 74 * LL, 70 * LL, -1));     // knee forward (the way he faces)
			};
			// walking side-on: both legs come from the middle of the hips (they pass each other, never cross over)
			const mid = (H) => [lerp(H[0], hip[0], gw * 0.85), lerp(H[1], hip[1], gw * 0.85)];
			const hl = mid(hipL), hr = mid(hipR);
			hipL[0] = hl[0]; hipL[1] = hl[1]; hipR[0] = hr[0]; hipR[1] = hr[1];
			step(ll, hipL, G.feet.l);
			step(rl, hipR, G.feet.r);
		}
		if (shift) {      // feet stay where they were while the hips drift
			for (const L of [ll, rl]) Object.assign(L, ik2(L === ll ? hipL : hipR, [L.h[0] - shift, L.h[1]], 74 * LL, 70 * LL, -1));
		}
	}
	// hands that go somewhere by themselves, whatever the body width (elbows bend outwards to reach):
	// 'clasp' = both hands meet in front of the belly, 'belly' = one hand on the belly, 'hip' = hands on the hips
	const gripOf = (n) => {
		const g = (p) => (p ? p.grip || (p.clasp ? {l: 'clasp', r: 'clasp'} : null) : null);
		if ((D.poses || {})[n]) return g(D.poses[n]);
		const m = (D.moves || {})[n];      // a move that leaves the arms alone keeps its base pose's hands
		return m && !(m.keys || []).some((q) => q.l_arm || q.r_arm) ? g((D.poses || {})[m.base]) : null;
	};
	const gripNow = (changing && bl < 0.5 ? gripOf(opts.from) : gripOf(opts.pose)) || {};
	const reach = (S, sideSign, L, where, w) => {
		if (!where || w <= 0) return;
		const meet = where === 'hip' ? side(add(hip, up(24)), sideSign * (Math.max(TORSO.arm, 12) + 8))
			: where === 'belly' ? add(add(hip, up(36)), [sideSign * 3, 0]) : add(add(hip, up(14)), [sideSign * 7, 0]);
		const dx = meet[0] - S[0], dy = meet[1] - S[1];
		const U = 62 * AL, Dn = 58 * AL;
		const dist = Math.min(Math.hypot(dx, dy), U + Dn - 1);
		const base = Math.atan2(dy, dx);
		const cosA = (U * U + dist * dist - Dn * Dn) / (2 * U * dist);
		const a1 = base - sideSign * Math.acos(Math.max(-1, Math.min(1, cosA)));   // elbow to the outside
		const e = [S[0] + Math.cos(a1) * U, S[1] + Math.sin(a1) * U];
		const h = [S[0] + dx * dist / Math.hypot(dx, dy), S[1] + dy * dist / Math.hypot(dx, dy)];
		L.e = [lerp(L.e[0], e[0], w), lerp(L.e[1], e[1], w)];
		L.h = [lerp(L.h[0], h[0], w), lerp(L.h[1], h[1], w)];
		if (HUM && w < 1) {     // part-way: re-solve the elbow for the in-between hand, on the side nearest the blended elbow
			const U2 = 62 * AL, D2 = 58 * AL;
			const A = ik2(S, L.h, U2, D2, 1), B = ik2(S, L.h, U2, D2, -1);
			const dA = Math.hypot(A.e[0] - L.e[0], A.e[1] - L.e[1]), dB = Math.hypot(B.e[0] - L.e[0], B.e[1] - L.e[1]);
			Object.assign(L, dA < dB ? A : B);
		}
	};
	const gFrom = changing ? gripOf(opts.from) || {} : {}, gTo = gripOf(opts.pose) || {};
	if (HUM && changing && kk > 0.999) {
		// changing gesture: where each hand is in the old pose and in the new one; the hand glides straight between
		// them and the elbow follows on its natural side, so the arm keeps its length (never stretches or snaps)
		const armsOf = (name) => {
			const q = poseAt(D, name, t, true);
			if (G && gaitOf(name)) { q.l_arm = G.l_arm; q.r_arm = G.r_arm; }
			aimArm(q, name);
			const sw = (D.moves || {})[name] ? 0 : sway;
			const L = limb(armL, q.l_arm[0] - sw, q.l_arm[1], 62 * AL, 58 * AL, lean), Rr = limb(armR, q.r_arm[0] + sw, q.r_arm[1], 62 * AL, 58 * AL, lean);
			const g = gripOf(name) || {};
			reach(armL, -1, L, g.l, 1);
			reach(armR, 1, Rr, g.r, 1);
			return {l: L, r: Rr};
		};
		const A0 = armsOf(opts.from), A1 = armsOf(opts.pose);
		const glide = (L, a, b, S) => {
			const be = ease(opts.blend);
			const h = [lerp(a.h[0], b.h[0], be), lerp(a.h[1], b.h[1], be)];
			const hint = [lerp(a.e[0], b.e[0], be), lerp(a.e[1], b.e[1], be)];
			const U2 = 62 * AL, D2 = 58 * AL;
			const P1 = ik2(S, h, U2, D2, 1), P2 = ik2(S, h, U2, D2, -1);
			Object.assign(L, Math.hypot(P1.e[0] - hint[0], P1.e[1] - hint[1]) < Math.hypot(P2.e[0] - hint[0], P2.e[1] - hint[1]) ? P1 : P2);
		};
		glide(la, A0.l, A1.l, armL);
		glide(ra, A0.r, A1.r, armR);
	} else {
		for (const [g, w] of [[gFrom, (1 - bl) * kk], [gTo, (changing ? bl : 1) * kk]]) {
			reach(outlined ? armL : shoulder, -1, la, g.l, w);
			reach(outlined ? armR : shoulder, 1, ra, g.r, w);
		}
	}
	// which hand shape: a pointing finger, a fist (moving, hands on hips, cheering) or an open hand
	const gesture = (sd) => {
		const name = (changing && bl < 0.6 ? opts.from : opts.pose) || 'stand';    // the hand changes shape part-way
		if (sd === 'r' && /^(point|explain)$/.test(name) && k > 0.4) return 'point';
		const g = gripNow[sd];
		if (g === 'clasp') return 'clasp';
		return !!(D.moves || {})[name] || g === 'hip' || g === 'belly' || /^(happy|victory|confident|celebrate)$/.test(name) ? 'fist' : 'open';
	};
	const HAIR = ['spiky_hair', 'side_part', 'long_hair', 'hood', 'cap', 'flatcap', 'crown', 'ponytail', 'tufts', 'headband', 'helmet', 'straw_hat', 'explorer_hat',
		'beanie', 'hardhat', 'tophat', 'grad_cap', 'chef_hat', 'beret', 'party_hat', 'bob_hair', 'bun', 'antenna',
		'veil', 'pointed_hood', 'fur_hood', 'messy_hair', 'cave_hair', 'turban', 'police_cap', 'pilot_cap', 'pillbox', 'bucket_hat', 'cowboy_hat', 'tricorn',
		'viking_helmet', 'knight_helmet', 'samurai_helmet', 'roman_helmet', 'ninja_mask', 'wizard_hat', 'space_helmet', 'fire_helmet', 'tiara', 'keffiyeh',
		'bandana', 'sage_bun', 'shikha'];
	const strands = outlined && !BS && !HAIR.some((h) => parts.has(h)) && !(av.costume && av.costume.top && av.costume.top.hood)
		? `<path d="M-8,-47 Q-12,-60 -20,-65 M1,-48 Q1,-62 5,-70 M9,-47 Q16,-58 24,-60" fill="none" stroke="${OL}" stroke-width="4" stroke-linecap="round"/>` : '';

	const out = [];
	out.push(`<ellipse cx="${f(hip[0] - (P.y || 0) * 0)}" cy="398" rx="${f(70 - Math.max(0, -(P.y || 0)) * 0.6)}" ry="10" fill="rgba(0,0,0,0.22)"/>`);
	if (P.prop === 'chair') {
		out.push(`<g${op}><path d="M50,${f(hip[1] + 6)} L170,${f(hip[1] + 6)}" stroke="${acc}" stroke-width="10" stroke-linecap="round"/>
			<path d="M60,${f(hip[1] + 6)} L56,396 M160,${f(hip[1] + 6)} L164,396 M50,${f(hip[1] + 6)} L44,${f(hip[1] - 70)}" stroke="${acc}" stroke-width="8" stroke-linecap="round"/></g>`);
	}
	out.push(`<g transform="${headT}"${op}>${pick(HEAD_BACK)}${outlined && av.costume ? costumeKit({cos: av.costume, OL, OW: 3.6, TW: 10, op: '', t, moving, lean, P, ink, g: {}}).k.hood() : ''}</g>`);
	const cos = outlined && av.costume ? av.costume
		: plain && BS.sporty ? {wrist: acc} : null;     // sporty: wristbands (its high-top sneakers are the body style's own feet)
	const kit = cos ? costumeKit({cos, OL, OW, TW, op, t, moving, lean, P, ink,
		g: {bodyT, hip, hipL, hipR, legL: hose(hipL, ll.e, ll.h), legR: hose(hipR, rl.e, rl.h), armLd: hose(armL, la.e, la.h), armRd: hose(armR, ra.e, ra.h),
			ll: {a: hipL, e: ll.e, h: ll.h}, rl: {a: hipR, e: rl.e, h: rl.h}, lh: la.h, rh: ra.h}}) : null;
	const limbDraw = (a, m, b) => {
		if (!(BS && BS.seg)) return tube(hose(a, m, b));
		const cut = (p, q, gap) => { const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; return [q[0] - dx / l * gap, q[1] - dy / l * gap]; };
		const m1 = cut(a, m, 4), m2 = cut(b, m, 4);
		return tube(`M${f(a[0])},${f(a[1])} L${f(m1[0])},${f(m1[1])}`) + tube(`M${f(m2[0])},${f(m2[1])} L${f(b[0])},${f(b[1])}`);
	};
	const behindL = !!(outlined && G && la.h[0] > neck[0] + 6), behindR = !!(outlined && G && ra.h[0] < neck[0] - 6);
	if (outlined) {
		// legs behind a small white body, then the clothes on top
		if (kit) out.push(kit.k.cape());
		out.push(limbDraw(hipL, ll.e, ll.h), limbDraw(hipR, rl.e, rl.h));
		if (kit) out.push(kit.k.legs());
		if (parts.has('shorts')) {
			for (const [H, L] of [[hipL, ll], [hipR, rl]]) {
				const q = [lerp(H[0], L.e[0], 0.45), lerp(H[1], L.e[1], 0.45)];
				out.push(`<path d="M${f(H[0])},${f(H[1] - 6)} L${f(q[0])},${f(q[1])}" stroke="${OL}" stroke-width="${f(TW + 10)}" stroke-linecap="round"${op}/><path d="M${f(H[0])},${f(H[1] - 6)} L${f(q[0])},${f(q[1])}" stroke="#2B2D42" stroke-width="${f(TW + 6)}" stroke-linecap="round"${op}/>`);
			}
		}
		const tilt = (L, svg) => {
			if (!BS) return svg;
			const lift = Math.max(0, Math.min(1, (386 - L.h[1]) / 24));
			const r = -Math.atan2(L.h[0] - L.e[0], L.h[1] - L.e[1]) * 180 / Math.PI * 0.8 * lift;
			return Math.abs(r) < 0.5 ? svg : `<g transform="rotate(${f(r)} ${f(L.h[0])} ${f(L.h[1])})">${svg}</g>`;
		};
		const backFoot = turnW > 0.5 ? 1 : -1;              // turned: both shoes point the way he faces
		out.push(tilt(ll, (kit && kit.k.foot(ll.h, backFoot)) || foot(ll.h, backFoot)), tilt(rl, (kit && kit.k.foot(rl.h, 1)) || foot(rl.h, 1)));
		if (kit) out.push(kit.k.wrap());
		// walking: the arm swinging across the body passes behind it (as seen from the side)
		if (behindL) out.push(limbDraw(armL, la.e, la.h), kit ? kit.k.arms('l') : '', hand(la.h, la.e, 'l'));
		if (behindR) out.push(limbDraw(armR, ra.e, ra.h), kit ? kit.k.arms('r') : '', hand(ra.h, ra.e, 'r'));
		const torso = TORSO.d;
		out.push(`<g transform="${bodyT}"><path d="${torso}" fill="${parts.has('shirt') ? acc : shaded ? 'url(#shBody)' : FILL}" stroke="${OL}" stroke-width="${f(OW > 0 ? OW + (BS && BS.soft ? 0 : 0.4) : 0)}" stroke-linejoin="${BS && BS.torso === 'angular' ? 'miter' : 'round'}"${dash}/></g>`);
		if (kit) out.push(kit.k.torso(), kit.k.gear());
		out.push(`<g transform="${bodyT}"${op}>${pick(BODY_BACK)}</g>`);
		out.push(`<g transform="${bodyT}"${op}>${pick(BODY_FRONT)}</g>`);
		if (kit) out.push(kit.k.propsBack());
		if (!behindL) out.push(limbDraw(armL, la.e, la.h));
		if (!behindR) out.push(limbDraw(armR, ra.e, ra.h));
		const band = (a, b, u, w, col) => { const q = [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
			return `<path d="M${f(a[0])},${f(a[1])} L${f(q[0])},${f(q[1])}" stroke="${OL}" stroke-width="${f(w + 2 * Math.max(2, OW))}" stroke-linecap="round"${op}/><path d="M${f(a[0])},${f(a[1])} L${f(q[0])},${f(q[1])}" stroke="${col}" stroke-width="${f(w)}" stroke-linecap="round"${op}/>`; };
		if (parts.has('shirt')) out.push((behindL ? '' : band(armL, la.e, 0.42, TW + 6, acc)) + (behindR ? '' : band(armR, ra.e, 0.42, TW + 6, acc)));
		if (kit) out.push(kit.k.arms((behindL ? '' : 'l') + (behindR ? '' : 'r')));
	} else {
		out.push(`<g transform="${bodyT}"${op}>${pick(BODY_BACK)}</g>`);
		out.push(line(hose(hip, ll.e, ll.h)), line(hose(hip, rl.e, rl.h)));
		const seg = (a, b, u0, u1, w, col) => `<path d="M${f(lerp(a[0], b[0], u0))},${f(lerp(a[1], b[1], u0))} L${f(lerp(a[0], b[0], u1))},${f(lerp(a[1], b[1], u1))}" stroke="${col}" stroke-width="${f(w)}" stroke-linecap="round"${op}/>`;
		if (parts.has('shorts')) out.push(seg(hip, ll.e, 0, 0.45, W * 2.4, ink), seg(hip, rl.e, 0, 0.45, W * 2.4, ink));     // Kino shorts: thick bands
		out.push(foot(ll.h, -1), foot(rl.h, 1));
		if (!parts.has('hoodie') && !parts.has('dress')) out.push(line(`M${f(hip[0])},${f(hip[1])} L${f(neck[0])},${f(neck[1])}`, W + 1));
		if (parts.has('shirt')) out.push(seg(neck, hip, 0.04, 0.93, W * 3.4, acc));
		if (parts.has('dress')) out.push(line(`M${f(neck[0])},${f(neck[1])} L${f(neck[0])},${f(neck[1] + 20)}`, W + 1));
		out.push(`<g transform="${bodyT}"${op}>${pick(BODY_FRONT)}</g>`);
		out.push(line(hose(shoulder, la.e, la.h)), line(hose(shoulder, ra.e, ra.h)));
		if (parts.has('shirt')) out.push(seg(shoulder, la.e, 0, 0.42, W * 2.2, acc), seg(shoulder, ra.e, 0, 0.42, W * 2.2, acc));
	}
	const front = [!behindL, !behindR];
	if (front[0]) out.push(hand(la.h, la.e, 'l'));
	if (front[1]) out.push(hand(ra.h, ra.e, 'r'));
	if (kit) out.push(kit.k.propsFront());
	if (parts.has('briefcase') && !moving) out.push(`<g${op}><rect x="${f(la.h[0] - 28)}" y="${f(la.h[1] + 2)}" width="56" height="40" rx="7" fill="${acc}"/><path d="M${f(la.h[0] - 10)},${f(la.h[1] + 2)} L${f(la.h[0] - 10)},${f(la.h[1] - 6)} L${f(la.h[0] + 10)},${f(la.h[1] - 6)} L${f(la.h[0] + 10)},${f(la.h[1] + 2)}" fill="none" stroke="${acc}" stroke-width="5"/></g>`);
	if (parts.has('cane')) out.push(`<path d="M${f(la.h[0])},${f(la.h[1])} L${f(la.h[0] - 8)},396" stroke="#8B5A2B" stroke-width="9" stroke-linecap="round"${op}/><path d="M${f(la.h[0])},${f(la.h[1])} q16,-14 22,4" fill="none" stroke="#8B5A2B" stroke-width="9" stroke-linecap="round"${op}/>`);
	if (holdSrc && k > 0.05) out.push(`<image href="${holdSrc}" x="${f(ra.h[0] - 36)}" y="${f(ra.h[1] - 64)}" width="72" height="72" opacity="${f(k)}"/>`);
	// head (a many-sided head for the geometric style)
	const headLine = outlined ? (BS ? (flat ? 0 : BS.soft ? 1.4 : BS.headLine || Math.max(3, (OW || 3) + 0.9)) : OW + 0.9) : W / (BS && BS.stick ? headScale : 1);
	const headShape = av.head_shape === 'square'
		? `<rect x="-46" y="-46" width="92" height="92" rx="12" fill="${faceFill}" stroke="${ink}" stroke-width="${f(headLine)}"${dash}/>`
		: BS && BS.headShape === 'octagon'
		? `<path d="${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => { const a = Math.PI / 4.5 * i - Math.PI / 2; return `${i ? 'L' : 'M'}${f(Math.cos(a) * 51)},${f(Math.sin(a) * 51)}`; }).join(' ')} Z" fill="${faceFill}" stroke="${ink}" stroke-width="${f(headLine)}" stroke-linejoin="miter"${dash}/>`
		: `<circle cx="0" cy="0" r="48" fill="${faceFill}" stroke="${ink}" stroke-width="${f(headLine)}"${dash}/>`;
	const hoodUp = outlined && av.costume && av.costume.top && av.costume.top.shape === 'hoodie' && av.costume.top.hood;
	const hoodFront = hoodUp ? `<path d="M-56,22 Q-62,-58 0,-62 Q62,-58 56,22 Q50,-30 0,-36 Q-50,-30 -56,22 Z" fill="${av.costume.top.color || '#2F7FD0'}" stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"/>` : '';
	out.push(`<g transform="${headT}">
		${headShape}
		<g${op}>${strands}${look || turnW > 0.01 ? `<g transform="translate(${f(((look && look.x) || 0) * 9 + turnW * (BS && BS.stick ? 0 : 13))} ${f(((look && look.y) || 0) * 5)})">${face}</g>` : face}${pick(HEAD_FRONT)}${hoodFront}</g></g>`);
	// action lines: short strokes that flick when he points / explains or jumps / celebrates (body styles only)
	if (BS && k > 0.5 && (!changing || bl > 0.6)) {
		const name = opts.pose || '';
		const flick = 0.55 + 0.45 * Math.abs(Math.sin(t * 9));
		const burst = (cx, cy, dirDeg, n, len) => Array.from({length: n}).map((_, i) => {
			const a = rad(dirDeg + (i - (n - 1) / 2) * 32);
			const r0 = 22, r1 = 22 + len * flick;
			return `M${f(cx + Math.sin(a) * r0)},${f(cy - Math.cos(a) * r0)} L${f(cx + Math.sin(a) * r1)},${f(cy - Math.cos(a) * r1)}`;
		}).join(' ');
		let d = '';
		if (/^(point|explain|present)$/.test(name)) d = burst(ra.h[0] + 6, ra.h[1] - 6, 35, 3, 16);
		else if (/^(jump|celebrate|victory|happy|jumping_jacks|dance)$/.test(name)) d = burst(headC[0], headC[1] - R, 0, 3, 18) + ' ' + burst(headC[0], headC[1] - R + 10, 0, 1, 0);
		if (BS.drops && /^(jump|celebrate|jumping_jacks)$/.test(name) && (P.y || 0) < -20) {
			for (const ft of [ll.h, rl.h]) d += ` M${f(ft[0] - 2)},${f(ft[1] + 20)} Q${f(ft[0] - 4)},${f(ft[1] + 30)} ${f(ft[0] - 9)},${f(ft[1] + 38)} M${f(ft[0] + 9)},${f(ft[1] + 20)} Q${f(ft[0] + 7)},${f(ft[1] + 30)} ${f(ft[0] + 2)},${f(ft[1] + 38)}`;
		}
		if (BS.speed && moving) {    // speed lines behind the trailing foot
			const back = ll.h[0] < rl.h[0] ? ll.h : rl.h;
			d += ` M${f(back[0] - 30)},${f(back[1] - 34)} L${f(back[0] - 48)},${f(back[1] - 40)} M${f(back[0] - 26)},${f(back[1] - 18)} L${f(back[0] - 50)},${f(back[1] - 20)}`;
		}
		const lc = BS.lines ? (darkBg && BS.rimOnDark ? BS.rimOnDark : BS.lines) : acc;
		if (d) out.push(`<path d="${d}" fill="none" stroke="${lc}" stroke-width="${BS.lines ? 4 : 5}" stroke-linecap="round" opacity="${f(Math.min(1, k))}"/>`);
	}
	if (opts.joints) Object.assign(opts.joints, {hip, neck, ll, rl, la, ra});    // for tests: where the joints ended up
	const scale = av.scale || 1;
	let looks = '';
	if (shaded) looks += `<defs><radialGradient id="shHead" cx=".36" cy=".3" r=".75"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".6" stop-color="#EEF1F6"/><stop offset="1" stop-color="#C3CAD6"/></radialGradient>
		<linearGradient id="shBody" x1="0" y1="0" x2="1" y2=".25"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#E9EDF3"/><stop offset="1" stop-color="#BFC7D3"/></linearGradient></defs>`;
	let body = out.join('');
	if (BS && BS.hatch) {
		looks += `<defs><pattern id="hatch" width="9" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
			<rect width="9" height="11" fill="#FBFAF6"/><path d="M0,3 L9,3" stroke="#E2DDD2" stroke-width="1"/></pattern></defs>`;
	}
	if (sketch) {     // the lines "boil" a little: a new wobble 8 times a second, like frames drawn by hand
		const seed = Math.floor(t * 8) % 7;
		const amt = (BS && BS.wobble) || 5.5;
		looks += `<defs><filter id="sk${seed}" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="${BS && BS.wobble ? 0.06 : 0.045}" numOctaves="2" seed="${seed + 3}"/>
			<feDisplacementMap in="SourceGraphic" scale="${amt}" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`;
		// a second, offset pass of the same drawing: the double, scratchy line of a quick sketch
		body = BS && BS.hatch ? `<g filter="url(#sk${(seed + 3) % 7})" opacity=".55" transform="translate(2.5 -1.5)">${body}</g><g filter="url(#sk${seed})">${body}</g>` : `<g filter="url(#sk${seed})">${body}</g>`;
		if (BS && BS.hatch) looks += `<defs><filter id="sk${(seed + 3) % 7}" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="${(seed + 3) % 7 + 3}"/>
			<feDisplacementMap in="SourceGraphic" scale="${amt}" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`;
	}
	return `<g transform="translate(100 398) scale(${scale}) translate(-100 -398)">${kit ? kit.defs() : ''}${looks}${body}</g>`;
};

// list helpers for the app / director
export const poseNames = (data) => [...Object.keys(data.poses || {}), ...Object.keys(data.moves || {})];
