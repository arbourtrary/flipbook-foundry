import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	figure,
	headPath,
	wrapSvg,
	interpolateLoop,
	palindrome,
	type Joints
} from '../src/lib/font/rig.ts';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const posesDir = join(repo, 'src/poses');
const manifestPath = join(repo, 'src/lib/font/poses.json');

const FRAMES_PER_ANIM = 10;

// ----- joint library -----

const STAND: Joints = {
	head: [500, 220],
	neck: [500, 305],
	hips: [500, 555],
	// Arms hang at the side, hands just below hip level — natural rest pose.
	lhand: [400, 595],
	rhand: [600, 595],
	lfoot: [430, 880],
	rfoot: [570, 880]
};

// ----- locomotion -----

// Walk: upright stride with contralateral arm swing — when one leg strikes,
// the OPPOSITE arm peaks forward/up while the same-side arm trails back/down.
// Hands travel y=470..680 (a ~210px swing) so the motion reads at a glance.
// Critical floor invariant: in every keyframe AND every interpolated frame, at
// least one foot is at FLOOR_Y. Critical elbow invariant: each elbow stays on
// the SAME SIDE of its shoulder→hand axis across all keys (left elbow always
// left-of-axis, right elbow always right-of-axis). If an elbow flipped sides
// mid-cycle, interpolation would pass through fully-straight, and the forearm
// capsule would sweep through then back out of the upper arm capsule — that
// sweep flashes a thin unfilled wedge near the elbow. Outward-bent elbows
// keep the cross-product sign constant through the whole loop.
const WALK_KEYS: Joints[] = [
	// Right heel strike: right planted forward, left toe still on ground (back).
	// Contralateral: left arm at peak forward/up; right arm trails back/down.
	// Elbows kicked outward — never cross the shoulder→hand axis.
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [420, 470], rhand: [580, 680],
		lfoot: [430, 880], rfoot: [560, 880],
		lelbow: [350, 510], relbow: [620, 555],
		lknee: [435, 725], rknee: [555, 725]
	},
	// Right mid-stance: right planted under body, left swings through (lifted).
	// Arms passing through neutral as they reverse swing direction.
	{
		head: [500, 218], neck: [500, 303], hips: [500, 552],
		lhand: [430, 595], rhand: [570, 595],
		lfoot: [495, 800], rfoot: [510, 880],
		lelbow: [390, 500], relbow: [610, 500],
		lknee: [490, 695], rknee: [515, 720]
	},
	// Left heel strike (mirror of KEY 0): left planted forward, right toe back.
	// Right arm at peak forward/up; left arm trails back/down.
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [420, 680], rhand: [580, 470],
		lfoot: [440, 880], rfoot: [570, 880],
		lelbow: [380, 555], relbow: [650, 510],
		lknee: [445, 725], rknee: [565, 725]
	},
	// Left mid-stance: left planted under body, right swings through.
	{
		head: [500, 218], neck: [500, 303], hips: [500, 552],
		lhand: [430, 595], rhand: [570, 595],
		lfoot: [490, 880], rfoot: [505, 800],
		lelbow: [390, 500], relbow: [610, 500],
		lknee: [485, 720], rknee: [510, 695]
	}
];

// Run: strong forward lean baked into head/neck/hips offsets (no spineLean —
// the geometry carries the momentum). 6 keys per cycle: strike → midstance →
// toe-off, mirrored for the other leg. Critical floor invariant: across all
// three stance keys per leg, the contact foot's y stays locked at 880 (heel
// strike → flat → toe pivot). Only the brief KEY2→KEY3 and KEY5→KEY0 segments
// interpolate through flight, so the figure now visibly plants and pushes off
// instead of permanently hovering. Previous 4-key cycle hit y=880 only at two
// instantaneous frames out of 20 — the source of the "feet float at all times"
// look. Arms swing contralaterally with strong peak excursion.
const RUN_KEYS: Joints[] = [
	// Right heel strike — right foot lands forward, planted. Left leg flexed
	// back/up at peak rear swing. Left arm forward (peak), right arm back (peak).
	{
		head: [610, 208], neck: [550, 294], hips: [444, 549],
		lhand: [345, 460], rhand: [720, 470],
		lfoot: [310, 720], rfoot: [560, 880],
		lelbow: [385, 365], relbow: [595, 480],
		lknee: [395, 680], rknee: [520, 720]
	},
	// Right midstance — right foot planted under body. Left leg swung
	// forward, knee high. Arms rotating through neutral.
	{
		head: [615, 210], neck: [552, 296], hips: [448, 552],
		lhand: [430, 400], rhand: [660, 540],
		lfoot: [430, 690], rfoot: [490, 880],
		lelbow: [425, 380], relbow: [605, 500],
		lknee: [445, 650], rknee: [505, 725]
	},
	// Right toe-off — right foot still at floor (toe pivot, heel raised), at
	// back position. Left leg descending toward strike. Arms reversing: right
	// arm sweeping forward/up, left arm at peak back-and-down.
	{
		head: [615, 212], neck: [553, 298], hips: [448, 554],
		lhand: [620, 600], rhand: [400, 380],
		lfoot: [540, 740], rfoot: [410, 880],
		lelbow: [580, 520], relbow: [430, 380],
		lknee: [490, 680], rknee: [445, 800]
	},
	// Left heel strike — mirror of KEY 0.
	{
		head: [610, 208], neck: [550, 294], hips: [444, 549],
		lhand: [720, 470], rhand: [345, 460],
		lfoot: [560, 880], rfoot: [310, 720],
		lelbow: [595, 480], relbow: [385, 365],
		lknee: [520, 720], rknee: [395, 680]
	},
	// Left midstance — mirror of KEY 1.
	{
		head: [615, 210], neck: [552, 296], hips: [448, 552],
		lhand: [660, 540], rhand: [430, 400],
		lfoot: [490, 880], rfoot: [430, 690],
		lelbow: [605, 500], relbow: [425, 380],
		lknee: [505, 725], rknee: [445, 650]
	},
	// Left toe-off — mirror of KEY 2.
	{
		head: [615, 212], neck: [553, 298], hips: [448, 554],
		lhand: [400, 380], rhand: [620, 600],
		lfoot: [410, 880], rfoot: [540, 740],
		lelbow: [430, 380], relbow: [580, 520],
		lknee: [445, 800], rknee: [490, 680]
	}
];

// Jump: 8-key vertical cycle so 20-frame interpolation has room to breathe.
// stand → pre-crouch → deep crouch (windup) → push-off → apex (body straight,
// arms up, explicit elbows so auto-bend doesn't fold the reach) → descending
// → landing impact → deep absorb (knees driven down) → loop.
// No arm stretch anywhere — limb extension comes from joint geometry only.
const JUMP_KEYS: Joints[] = [
	{ ...STAND },
	{
		head: [500, 270], neck: [500, 355], hips: [500, 600],
		lhand: [390, 650], rhand: [610, 650],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [385, 545], relbow: [615, 545],
		lknee: [400, 750], rknee: [600, 750]
	},
	{
		head: [500, 380], neck: [500, 460], hips: [500, 700],
		lhand: [320, 800], rhand: [680, 800],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [340, 700], relbow: [660, 700],
		lknee: [340, 820], rknee: [660, 820]
	},
	{
		head: [500, 270], neck: [500, 350], hips: [500, 580],
		lhand: [380, 400], rhand: [620, 400],
		lfoot: [460, 850], rfoot: [540, 850],
		lelbow: [385, 480], relbow: [615, 480],
		lknee: [430, 720], rknee: [570, 720]
	},
	{
		head: [500, 130], neck: [500, 210], hips: [500, 460],
		lhand: [430, 50], rhand: [570, 50],
		lfoot: [470, 740], rfoot: [530, 740],
		lelbow: [465, 130], relbow: [535, 130]
	},
	{
		head: [500, 250], neck: [500, 335], hips: [500, 580],
		lhand: [430, 270], rhand: [570, 270],
		lfoot: [470, 820], rfoot: [530, 820],
		lelbow: [430, 380], relbow: [570, 380]
	},
	{
		head: [500, 290], neck: [500, 375], hips: [500, 620],
		lhand: [400, 500], rhand: [600, 500],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 430], relbow: [600, 430],
		lknee: [400, 760], rknee: [600, 760]
	},
	{
		head: [500, 350], neck: [500, 435], hips: [500, 680],
		lhand: [380, 560], rhand: [620, 560],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [380, 480], relbow: [620, 480],
		lknee: [360, 820], rknee: [640, 820]
	}
];

// Dance: four asymmetric beats with the body shifting weight side-to-side and
// the arms swinging through different positions. Explicit elbows + knees on
// every key; feet always at FLOOR_Y; no stretch.
const DANCE_KEYS: Joints[] = [
	{
		head: [490, 225], neck: [495, 310], hips: [510, 555],
		lhand: [280, 220], rhand: [580, 480],
		lfoot: [420, 880], rfoot: [580, 880],
		lelbow: [350, 360], relbow: [560, 410],
		lknee: [435, 720], rknee: [580, 720]
	},
	{
		head: [500, 215], neck: [500, 300], hips: [500, 555],
		lhand: [220, 460], rhand: [780, 460],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [320, 380], relbow: [680, 380],
		lknee: [430, 720], rknee: [570, 720]
	},
	{
		head: [510, 225], neck: [505, 310], hips: [490, 555],
		lhand: [420, 480], rhand: [720, 220],
		lfoot: [420, 880], rfoot: [580, 880],
		lelbow: [440, 410], relbow: [650, 360],
		lknee: [420, 720], rknee: [565, 720]
	},
	{
		head: [500, 230], neck: [500, 315], hips: [495, 555],
		lhand: [410, 555], rhand: [590, 555],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [350, 480], relbow: [650, 480],
		lknee: [430, 720], rknee: [570, 720]
	}
];

// Greet (formerly 'wave'): right arm raised, hand swings side-to-side.
const GREET_KEYS: Joints[] = [
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [400, 595], rhand: [700, 200],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 480], relbow: [620, 330]
	},
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [400, 595], rhand: [620, 100],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 480], relbow: [580, 220]
	},
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [400, 595], rhand: [520, 80],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 480], relbow: [560, 220]
	},
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [400, 595], rhand: [620, 100],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 480], relbow: [580, 220]
	}
];

// Cheer: both arms up, body bouncing.
const CHEER_KEYS: Joints[] = [
	{
		head: [500, 240], neck: [500, 325], hips: [500, 575],
		lhand: [340, 200], rhand: [660, 200],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [380, 380], relbow: [620, 380],
		lknee: [420, 740], rknee: [580, 740]
	},
	{
		head: [500, 200], neck: [500, 285], hips: [500, 535],
		lhand: [380, 80], rhand: [620, 80],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [420, 280], relbow: [580, 280]
	},
	{
		head: [500, 230], neck: [500, 315], hips: [500, 565],
		lhand: [280, 240], rhand: [720, 240],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [360, 400], relbow: [640, 400]
	},
	{
		head: [500, 200], neck: [500, 285], hips: [500, 535],
		lhand: [380, 80], rhand: [620, 80],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [420, 280], relbow: [580, 280]
	}
];

// ----- postures -----

// Sit: stand → mid-squat → seated. Feet stay planted on the floor; knees
// drive outward as hips descend so the seated frame reads as cross-legged.
const SIT_KEYS = palindrome([
	{ ...STAND },
	{
		head: [500, 260], neck: [500, 345], hips: [500, 620],
		lhand: [380, 600], rhand: [620, 600],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [380, 480], relbow: [620, 480],
		lknee: [400, 770], rknee: [600, 770]
	},
	{
		head: [500, 320], neck: [500, 405], hips: [500, 680],
		lhand: [400, 700], rhand: [600, 700],
		lfoot: [330, 880], rfoot: [670, 880],
		lelbow: [370, 580], relbow: [630, 580],
		lknee: [310, 760], rknee: [690, 760]
	}
]);

// Idle (formerly 'lie'): stand → kneeling → flat on the floor. End frame has
// the whole body horizontal just above FLOOR_Y, head at one end, feet at the
// other — reads as "at rest" / idle.
const IDLE_KEYS = palindrome([
	{ ...STAND },
	{
		head: [380, 480], neck: [430, 540], hips: [560, 640],
		lhand: [320, 620], rhand: [420, 660],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [380, 580], relbow: [490, 600],
		lknee: [420, 780], rknee: [570, 780]
	},
	{
		head: [180, 810], neck: [280, 830], hips: [560, 850],
		lhand: [250, 870], rhand: [220, 800],
		lfoot: [820, 870], rfoot: [820, 830],
		lelbow: [220, 850], relbow: [240, 815],
		lknee: [700, 860], rknee: [700, 840]
	}
]);

// Kneel (formerly 'crouch'): stand → half-crouch → deep crouch. Knees push
// outward and down as hips descend; arms drop in front for balance.
const KNEEL_KEYS = palindrome([
	{ ...STAND },
	{
		head: [500, 280], neck: [500, 365], hips: [500, 605],
		lhand: [410, 600], rhand: [590, 600],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 480], relbow: [600, 480],
		lknee: [400, 760], rknee: [600, 760]
	},
	{
		head: [500, 380], neck: [500, 460], hips: [500, 700],
		lhand: [410, 760], rhand: [590, 760],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 650], relbow: [600, 650],
		lknee: [340, 820], rknee: [660, 820]
	}
]);

// Clap: hands sweep in from the sides and meet at chest height.
const CLAP_KEYS = palindrome([
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [280, 460], rhand: [720, 460],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [360, 400], relbow: [640, 400],
		lknee: [430, 720], rknee: [570, 720]
	},
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [410, 440], rhand: [590, 440],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 410], relbow: [600, 410],
		lknee: [430, 720], rknee: [570, 720]
	},
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [495, 430], rhand: [505, 430],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [420, 410], relbow: [580, 410],
		lknee: [430, 720], rknee: [570, 720]
	}
]);

// Extend (formerly 'stretch'): arms reach above the head; final frame goes
// up on tip-toes.
const EXTEND_KEYS = palindrome([
	{ ...STAND },
	{
		head: [500, 215], neck: [500, 300], hips: [500, 555],
		lhand: [400, 280], rhand: [600, 280],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [410, 400], relbow: [590, 400]
	},
	{
		head: [500, 200], neck: [500, 285], hips: [500, 540],
		lhand: [440, 50], rhand: [560, 50],
		lfoot: [445, 880], rfoot: [555, 880],
		lelbow: [465, 175], relbow: [535, 175]
	}
]);

// ----- small motions -----

const NOD_KEYS: Joints[] = [
	{ ...STAND, head: [500, 205] },
	{ ...STAND, head: [500, 220] },
	{ ...STAND, head: [500, 245] },
	{ ...STAND, head: [500, 220] }
];

const SHAKE_HEAD_KEYS: Joints[] = [
	{ ...STAND, head: [465, 220] },
	{ ...STAND, head: [500, 220] },
	{ ...STAND, head: [535, 220] },
	{ ...STAND, head: [500, 220] }
];

// Yawn: arms rise to either side of the head as the body extends.
const YAWN_KEYS = palindrome([
	{ ...STAND },
	{
		head: [500, 215], neck: [500, 300], hips: [500, 555],
		lhand: [340, 280], rhand: [660, 280],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [390, 410], relbow: [610, 410]
	},
	{
		head: [500, 195], neck: [500, 280], hips: [500, 545],
		lhand: [350, 120], rhand: [650, 120],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 240], relbow: [600, 240]
	}
]);

// ----- gestures -----

const POINT_LEFT_KEYS = palindrome([
	{ ...STAND },
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [320, 460], rhand: [600, 595],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 420], relbow: [600, 480]
	},
	{
		head: [510, 215], neck: [502, 305], hips: [500, 555],
		lhand: [140, 360], rhand: [600, 595],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [320, 360], relbow: [600, 480]
	}
]);

const POINT_RIGHT_KEYS = palindrome([
	{ ...STAND },
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [400, 595], rhand: [680, 460],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 480], relbow: [600, 420]
	},
	{
		head: [490, 215], neck: [498, 305], hips: [500, 555],
		lhand: [400, 595], rhand: [860, 360],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 480], relbow: [680, 360]
	}
]);

// Swim: alternating overhead reaches, feet planted (it's a stick figure on
// land doing the swim mime — not actually floating).
const SWIM_KEYS: Joints[] = [
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [400, 120], rhand: [600, 700],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [420, 230], relbow: [600, 480]
	},
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [320, 440], rhand: [680, 440],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [380, 400], relbow: [620, 400]
	},
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [400, 700], rhand: [600, 120],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 480], relbow: [580, 230]
	},
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [320, 440], rhand: [680, 440],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [380, 400], relbow: [620, 400]
	}
];

// X-leap (formerly 'star-jump'): arms and legs spread wide forming an X
// silhouette; feet leave FLOOR_Y at apex.
const X_LEAP_KEYS = palindrome([
	{ ...STAND },
	{
		head: [500, 210], neck: [500, 295], hips: [500, 545],
		lhand: [320, 380], rhand: [680, 380],
		lfoot: [340, 880], rfoot: [660, 880],
		lelbow: [370, 380], relbow: [630, 380],
		lknee: [400, 720], rknee: [600, 720]
	},
	{
		head: [500, 160], neck: [500, 245], hips: [500, 495],
		lhand: [220, 240], rhand: [780, 240],
		lfoot: [260, 780], rfoot: [740, 780],
		lelbow: [320, 340], relbow: [680, 340],
		lknee: [350, 660], rknee: [650, 660]
	}
]);

// Tip-toe: body rises while feet stay in contact with FLOOR_Y (toe contact).
const TIP_TOE_KEYS = palindrome([
	{ ...STAND },
	{
		head: [500, 200], neck: [500, 285], hips: [500, 535],
		lhand: [410, 575], rhand: [590, 575],
		lfoot: [450, 880], rfoot: [550, 880],
		lelbow: [410, 460], relbow: [590, 460],
		lknee: [445, 700], rknee: [555, 700]
	},
	{
		head: [500, 180], neck: [500, 265], hips: [500, 515],
		lhand: [400, 555], rhand: [600, 555],
		lfoot: [460, 880], rfoot: [540, 880],
		lelbow: [410, 440], relbow: [590, 440],
		lknee: [455, 690], rknee: [545, 690]
	}
]);

// Balance: one leg lifted high to the side, arms out wide as counter-weight.
const BALANCE_KEYS = palindrome([
	{ ...STAND },
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [320, 440], rhand: [680, 440],
		lfoot: [620, 760], rfoot: [570, 880],
		lelbow: [400, 420], relbow: [600, 420],
		lknee: [580, 700], rknee: [575, 720]
	},
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [210, 380], rhand: [790, 380],
		lfoot: [820, 580], rfoot: [570, 880],
		lelbow: [340, 400], relbow: [660, 400],
		lknee: [700, 640], rknee: [575, 720]
	}
]);

// Throw: stance → cocked windup → release → follow-through. Body twists from
// negative lean (away from throw direction) to positive lean (toward target).
const THROW_KEYS: Joints[] = [
	{ ...STAND },
	{
		head: [540, 220], neck: [520, 305], hips: [490, 555],
		lhand: [400, 595], rhand: [760, 260],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 480], relbow: [700, 380]
	},
	{
		head: [460, 240], neck: [480, 320], hips: [510, 555],
		lhand: [400, 595], rhand: [240, 140],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 480], relbow: [420, 250]
	},
	{
		head: [480, 240], neck: [490, 320], hips: [510, 555],
		lhand: [400, 595], rhand: [200, 580],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 480], relbow: [340, 440]
	}
];

// Lunge: deep step forward, lead knee bent at 90°, trail leg extended back.
const LUNGE_KEYS = palindrome([
	{ ...STAND },
	{
		head: [520, 260], neck: [510, 340], hips: [500, 620],
		lhand: [380, 660], rhand: [620, 660],
		lfoot: [300, 880], rfoot: [680, 880],
		lelbow: [380, 540], relbow: [620, 540],
		lknee: [360, 820], rknee: [700, 760]
	},
	{
		head: [560, 320], neck: [540, 400], hips: [500, 670],
		lhand: [380, 720], rhand: [620, 720],
		lfoot: [230, 880], rfoot: [780, 880],
		lelbow: [380, 600], relbow: [620, 600],
		lknee: [310, 820], rknee: [780, 760]
	}
]);

// Hop: anticipation → airborne → landing. Body tucks slightly at apex.
const HOP_KEYS: Joints[] = [
	{ ...STAND },
	{
		head: [500, 280], neck: [500, 365], hips: [500, 605],
		lhand: [400, 600], rhand: [600, 600],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 480], relbow: [600, 480],
		lknee: [400, 760], rknee: [600, 760]
	},
	{
		head: [500, 160], neck: [500, 245], hips: [500, 495],
		lhand: [380, 400], rhand: [620, 400],
		lfoot: [440, 720], rfoot: [560, 720],
		lelbow: [400, 450], relbow: [600, 450],
		lknee: [430, 620], rknee: [570, 620]
	},
	{
		head: [500, 280], neck: [500, 365], hips: [500, 605],
		lhand: [400, 600], rhand: [600, 600],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 480], relbow: [600, 480],
		lknee: [400, 760], rknee: [600, 760]
	}
];

// Salute: right hand rises to brow.
const SALUTE_KEYS = palindrome([
	{ ...STAND },
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [400, 595], rhand: [620, 340],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 480], relbow: [660, 460]
	},
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [400, 595], rhand: [555, 220],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 480], relbow: [640, 320]
	}
]);

// Tap-foot: right foot lifts and drops while the rest of the body holds.
const TAP_FOOT_KEYS: Joints[] = [
	{ ...STAND },
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [400, 595], rhand: [600, 595],
		lfoot: [430, 880], rfoot: [580, 840],
		lelbow: [400, 480], relbow: [600, 480],
		lknee: [430, 720], rknee: [580, 760]
	},
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [400, 595], rhand: [600, 595],
		lfoot: [430, 880], rfoot: [580, 800],
		lelbow: [400, 480], relbow: [600, 480],
		lknee: [430, 720], rknee: [580, 730]
	},
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [400, 595], rhand: [600, 595],
		lfoot: [430, 880], rfoot: [580, 840],
		lelbow: [400, 480], relbow: [600, 480],
		lknee: [430, 720], rknee: [580, 760]
	}
];

// ----- A-Z filler actions -----
// Eight new actions added so every letter A-Z has a primary action mapped to
// it. Each pairs with the existing letters: A applaud · F flex · M march ·
// O overhead · Q quake · U unwind · V victory · Z zen.

// Applaud (A): both arms raised above the head clapping. Distinct from
// CLAP_KEYS which meets at chest height — applaud meets overhead.
const APPLAUD_KEYS = palindrome([
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [380, 100], rhand: [620, 100],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 280], relbow: [600, 280]
	},
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [450, 80], rhand: [550, 80],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [420, 270], relbow: [580, 270]
	},
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [495, 70], rhand: [505, 70],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [440, 260], relbow: [560, 260]
	}
]);

// Flex (F): biceps pose — elbows out wide, hands curled toward shoulders.
// Slight pump between relaxed and peak flex.
const FLEX_KEYS = palindrome([
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [400, 380], rhand: [600, 380],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [320, 460], relbow: [680, 460]
	},
	{
		head: [500, 218], neck: [500, 303], hips: [500, 555],
		lhand: [410, 350], rhand: [590, 350],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [305, 450], relbow: [695, 450]
	}
]);

// March (M, ←"walk-right"): profile-view forward walk. Body leans rightward
// (positive spineLean), knees lift high. Contralateral arm swing. Always at
// least one foot at FLOOR_Y. Reads as walking-toward-the-right.
const MARCH_KEYS: Joints[] = [
	// Right knee high, left planted under body.
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [400, 480], rhand: [600, 660],
		lfoot: [470, 880], rfoot: [560, 720],
		lelbow: [380, 555], relbow: [620, 555],
		lknee: [475, 720], rknee: [540, 680],
		spineLean: 8
	},
	// Right foot striking forward, left still planted (toe contact).
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [430, 595], rhand: [570, 595],
		lfoot: [445, 880], rfoot: [580, 880],
		lelbow: [410, 500], relbow: [590, 500],
		lknee: [445, 725], rknee: [575, 725],
		spineLean: 8
	},
	// Left knee high, right planted.
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [400, 660], rhand: [600, 480],
		lfoot: [440, 720], rfoot: [530, 880],
		lelbow: [380, 555], relbow: [620, 555],
		lknee: [460, 680], rknee: [525, 720],
		spineLean: 8
	},
	// Left foot striking forward, right still planted.
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [430, 595], rhand: [570, 595],
		lfoot: [420, 880], rfoot: [555, 880],
		lelbow: [410, 500], relbow: [590, 500],
		lknee: [425, 725], rknee: [555, 725],
		spineLean: 8
	}
];

// Overhead (O): both arms reach straight up. Subtle breath — body rises and
// falls slightly. Distinct from EXTEND (which is a stretching cycle that
// starts from STAND and goes through tip-toe).
const OVERHEAD_KEYS = palindrome([
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [480, 60], rhand: [520, 60],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [470, 240], relbow: [530, 240]
	},
	{
		head: [500, 218], neck: [500, 303], hips: [500, 553],
		lhand: [480, 50], rhand: [520, 50],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [470, 235], relbow: [530, 235]
	}
]);

// Quake (Q): shivering — body and head oscillate horizontally with small
// arm jitter.
const QUAKE_KEYS: Joints[] = [
	{
		head: [493, 220], neck: [495, 305], hips: [498, 555],
		lhand: [395, 590], rhand: [598, 600],
		lfoot: [428, 880], rfoot: [568, 880],
		lelbow: [400, 475], relbow: [600, 480]
	},
	{
		head: [507, 220], neck: [505, 305], hips: [502, 555],
		lhand: [402, 600], rhand: [605, 590],
		lfoot: [432, 880], rfoot: [572, 880],
		lelbow: [400, 480], relbow: [600, 475]
	},
	{
		head: [495, 220], neck: [497, 305], hips: [499, 555],
		lhand: [397, 595], rhand: [602, 595],
		lfoot: [429, 880], rfoot: [569, 880],
		lelbow: [400, 478], relbow: [600, 478]
	},
	{
		head: [505, 220], neck: [503, 305], hips: [501, 555],
		lhand: [403, 595], rhand: [598, 595],
		lfoot: [431, 880], rfoot: [571, 880],
		lelbow: [400, 478], relbow: [600, 478]
	}
];

// Unwind (U): torso twists from one side to the other. spineLean rotates the
// upper body about the hips; arms trail outward through the rotation.
const UNWIND_KEYS = palindrome([
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [340, 480], rhand: [660, 620],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [380, 440], relbow: [620, 540],
		spineLean: -18
	},
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [400, 595], rhand: [600, 595],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 480], relbow: [600, 480],
		spineLean: 0
	},
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [340, 620], rhand: [660, 480],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [380, 540], relbow: [620, 440],
		spineLean: 18
	}
]);

// Victory (V): both arms raised in a V — fists up and out to the sides,
// forming the letter V silhouette. Slight celebratory pump.
const VICTORY_KEYS = palindrome([
	{
		head: [500, 220], neck: [500, 305], hips: [500, 555],
		lhand: [330, 140], rhand: [670, 140],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [400, 280], relbow: [600, 280]
	},
	{
		head: [500, 215], neck: [500, 300], hips: [500, 550],
		lhand: [320, 100], rhand: [680, 100],
		lfoot: [430, 880], rfoot: [570, 880],
		lelbow: [395, 260], relbow: [605, 260]
	}
]);

// Zen (Z): seated meditation — cross-legged on the floor, hands resting on
// knees, body upright and still. Subtle breath in/out.
const ZEN_KEYS = palindrome([
	{
		head: [500, 380], neck: [500, 465], hips: [500, 720],
		lhand: [395, 760], rhand: [605, 760],
		lfoot: [620, 815], rfoot: [380, 815],
		lelbow: [400, 620], relbow: [600, 620],
		lknee: [355, 770], rknee: [645, 770]
	},
	{
		head: [500, 375], neck: [500, 460], hips: [500, 718],
		lhand: [395, 758], rhand: [605, 758],
		lfoot: [620, 815], rfoot: [380, 815],
		lelbow: [400, 615], relbow: [600, 615],
		lknee: [355, 770], rknee: [645, 770]
	}
]);

// ----- definition lists -----

interface AnimDef {
	name: string;
	keys: Joints[];
	// Override per animation. Defaults to FRAMES_PER_ANIM.
	frames?: number;
}

const animDefs: AnimDef[] = [
	// Locomotion gets the denser frame budget — choppy interpolation reads as
	// stop-motion on these, where it stays acceptable on small expressions.
	{ name: 'walk', keys: WALK_KEYS, frames: 20 },
	{ name: 'run', keys: RUN_KEYS, frames: 20 },
	{ name: 'jump', keys: JUMP_KEYS, frames: 20 },

	{ name: 'dance', keys: DANCE_KEYS },
	{ name: 'greet', keys: GREET_KEYS },
	{ name: 'cheer', keys: CHEER_KEYS },
	{ name: 'sit', keys: SIT_KEYS },
	{ name: 'idle', keys: IDLE_KEYS },
	{ name: 'kneel', keys: KNEEL_KEYS },
	{ name: 'clap', keys: CLAP_KEYS },
	{ name: 'extend', keys: EXTEND_KEYS },
	{ name: 'nod', keys: NOD_KEYS },
	{ name: 'shake-head', keys: SHAKE_HEAD_KEYS },
	{ name: 'yawn', keys: YAWN_KEYS },
	{ name: 'point-left', keys: POINT_LEFT_KEYS },
	{ name: 'point-right', keys: POINT_RIGHT_KEYS },
	{ name: 'swim', keys: SWIM_KEYS },
	{ name: 'x-leap', keys: X_LEAP_KEYS },
	{ name: 'tip-toe', keys: TIP_TOE_KEYS },
	{ name: 'balance', keys: BALANCE_KEYS },
	{ name: 'throw', keys: THROW_KEYS },
	{ name: 'lunge', keys: LUNGE_KEYS },
	{ name: 'hop', keys: HOP_KEYS },
	{ name: 'salute', keys: SALUTE_KEYS },
	{ name: 'tap-foot', keys: TAP_FOOT_KEYS },
	// A-Z fillers (new actions added so every letter A-Z has a primary action)
	{ name: 'applaud', keys: APPLAUD_KEYS },
	{ name: 'flex', keys: FLEX_KEYS },
	{ name: 'march', keys: MARCH_KEYS },
	{ name: 'overhead', keys: OVERHEAD_KEYS },
	{ name: 'quake', keys: QUAKE_KEYS },
	{ name: 'unwind', keys: UNWIND_KEYS },
	{ name: 'victory', keys: VICTORY_KEYS },
	{ name: 'zen', keys: ZEN_KEYS }
];

interface StaticDef {
	name: string;
	codepoint: number;
	d: string;
}

const staticDefs: StaticDef[] = [
	{ name: 'stand', codepoint: 0xe001, d: figure(STAND) },
	{
		name: 'hands-on-hips',
		codepoint: 0xe002,
		d: figure({
			head: [500, 220],
			neck: [500, 305],
			hips: [500, 555],
			lhand: [410, 555],
			rhand: [590, 555],
			lfoot: [430, 880],
			rfoot: [570, 880],
			lelbow: [340, 540],
			relbow: [660, 540]
		})
	},
	{
		name: 'think',
		codepoint: 0xe003,
		d: figure({
			head: [500, 220],
			neck: [500, 305],
			hips: [500, 555],
			lhand: [400, 555],
			rhand: [520, 320],
			lfoot: [430, 880],
			rfoot: [570, 880],
			relbow: [620, 420]
		})
	},
	{
		name: 'shrug',
		codepoint: 0xe004,
		d: figure({
			head: [500, 220],
			neck: [500, 305],
			hips: [500, 555],
			lhand: [330, 380],
			rhand: [670, 380],
			lfoot: [430, 880],
			rfoot: [570, 880],
			lelbow: [360, 440],
			relbow: [640, 440]
		})
	},
	{ name: 'head-emerging-up', codepoint: 0xe005, d: headPath(500, 950) },
	{ name: 'head-emerging-down', codepoint: 0xe006, d: headPath(500, 50) },
	{ name: 'head-emerging-left', codepoint: 0xe007, d: headPath(50, 500) },
	{ name: 'head-emerging-right', codepoint: 0xe008, d: headPath(950, 500) }
];

// ----- A-Z letter glyphs -----
// Every uppercase letter A-Z (codepoints 0x41-0x5A) is mapped to a still
// frame of the corresponding action. Typing the letter renders a static
// pose; the animation runtime still cycles through the action's frames
// independently (via the animation name and its U+E1xx codepoint sequence).
// Frame chosen is the most identifiable / peak frame of each action.

interface LetterDef {
	letter: string;
	action: string;
	joints: Joints;
}

const letterDefs: LetterDef[] = [
	{ letter: 'A', action: 'applaud', joints: APPLAUD_KEYS[2] },
	{ letter: 'B', action: 'balance', joints: BALANCE_KEYS[2] },
	{ letter: 'C', action: 'clap', joints: CLAP_KEYS[2] },
	{ letter: 'D', action: 'dance', joints: DANCE_KEYS[0] },
	{ letter: 'E', action: 'extend', joints: EXTEND_KEYS[2] },
	{ letter: 'F', action: 'flex', joints: FLEX_KEYS[1] },
	{ letter: 'G', action: 'greet', joints: GREET_KEYS[1] },
	{ letter: 'H', action: 'hop', joints: HOP_KEYS[1] },
	{ letter: 'I', action: 'idle', joints: IDLE_KEYS[2] },
	{ letter: 'J', action: 'jump', joints: JUMP_KEYS[4] },
	{ letter: 'K', action: 'kneel', joints: KNEEL_KEYS[2] },
	{ letter: 'L', action: 'lunge', joints: LUNGE_KEYS[2] },
	{ letter: 'M', action: 'march', joints: MARCH_KEYS[0] },
	{ letter: 'N', action: 'nod', joints: NOD_KEYS[2] },
	{ letter: 'O', action: 'overhead', joints: OVERHEAD_KEYS[0] },
	{ letter: 'P', action: 'point', joints: POINT_RIGHT_KEYS[2] },
	{ letter: 'Q', action: 'quake', joints: QUAKE_KEYS[0] },
	{ letter: 'R', action: 'run', joints: RUN_KEYS[0] },
	{ letter: 'S', action: 'sit', joints: SIT_KEYS[2] },
	{ letter: 'T', action: 'throw', joints: THROW_KEYS[2] },
	{ letter: 'U', action: 'unwind', joints: UNWIND_KEYS[2] },
	{ letter: 'V', action: 'victory', joints: VICTORY_KEYS[0] },
	{ letter: 'W', action: 'walk', joints: WALK_KEYS[0] },
	{ letter: 'X', action: 'x-leap', joints: X_LEAP_KEYS[2] },
	{ letter: 'Y', action: 'yawn', joints: YAWN_KEYS[2] },
	{ letter: 'Z', action: 'zen', joints: ZEN_KEYS[0] }
];

// ----- emit -----

function hex(cp: number): string {
	return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
}

interface OutPose {
	name: string;
	codepoint: string;
	file: string;
}

const posesOut: OutPose[] = [];
const animationsOut: Record<string, string[]> = {};
const writes: Array<{ file: string; content: string }> = [];

for (const s of staticDefs) {
	const file = `${s.name}.svg`;
	posesOut.push({ name: s.name, codepoint: hex(s.codepoint), file });
	animationsOut[s.name] = [hex(s.codepoint)];
	writes.push({ file, content: wrapSvg(s.d) });
}

for (const l of letterDefs) {
	const cp = l.letter.charCodeAt(0);
	const name = `letter-${l.letter.toLowerCase()}`;
	const file = `${name}.svg`;
	posesOut.push({ name, codepoint: hex(cp), file });
	// Lowercase codepoint maps to the same pose — duplicate glyph entry so
	// both 'A' and 'a' render the same still.
	const cpLower = l.letter.toLowerCase().charCodeAt(0);
	posesOut.push({ name: `${name}-lc`, codepoint: hex(cpLower), file });
	writes.push({ file, content: wrapSvg(figure(l.joints)) });
}

// Auto-allocate codepoints in 16-rounded blocks so longer animations get the
// space they need and shorter ones still leave room to grow.
let nextCp = 0xe100;
for (const a of animDefs) {
	const animFrames = a.frames ?? FRAMES_PER_ANIM;
	const blockSize = Math.ceil(animFrames / 16) * 16;
	const frames = interpolateLoop(a.keys, animFrames);
	const seq: string[] = [];
	for (let i = 0; i < frames.length; i++) {
		const cp = nextCp + i;
		const name = `${a.name}-${(i + 1).toString().padStart(2, '0')}`;
		const file = `${name}.svg`;
		posesOut.push({ name, codepoint: hex(cp), file });
		writes.push({ file, content: wrapSvg(figure(frames[i])) });
		seq.push(hex(cp));
	}
	animationsOut[a.name] = seq;
	nextCp += blockSize;
}

await rm(posesDir, { recursive: true, force: true });
await mkdir(posesDir, { recursive: true });
for (const w of writes) {
	await writeFile(join(posesDir, w.file), w.content, 'utf8');
}

const manifest = {
	fontFamily: 'FoundrySans Stick',
	styleName: 'Regular',
	unitsPerEm: 1000,
	ascender: 800,
	descender: -200,
	defaultAdvanceWidth: 1000,
	viewBox: 1000,
	poses: posesOut,
	animations: animationsOut
};

await writeFile(manifestPath, JSON.stringify(manifest, null, '\t') + '\n', 'utf8');
console.log(
	`Wrote ${posesOut.length} poses (${animDefs.length} animations + ${staticDefs.length} static) → src/poses/ and updated src/lib/font/poses.json`
);
