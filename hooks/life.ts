// The small things that move around the still scene. Each is its own drawing
// that never changes; the hook only slides its layer or shows and hides it,
// which is the one kind of change the app draws without a flicker.

const OPEN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">'

// Follows the app's light or dark mode, as the scene does.
const NIGHT_VAR = '<style>:root{--night:0}@media (prefers-color-scheme:dark){:root{--night:1}}</style>'

// A fixed-seed generator, so a drawing is the same every time it is built.
function dice(seed: number): () => number {
  let s = seed

  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296

    return s / 4294967296
  }
}

function night(): string {
  const roll = dice(3)
  const stars: string[] = []

  for (let i = 0; i < 70; i += 1) {
    const x = roll() * 1600
    const y = roll() * 300
    // Fewer and fainter toward the horizon, none over the mountain's peak.
    if (y > 150 && x > 560 && x < 1020) {
      continue
    }
    stars.push(
      `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(0.7 + roll() * 1.3).toFixed(1)}" fill="#f4f7ff" opacity="${(0.45 + roll() * 0.5).toFixed(2)}"/>`,
    )
  }
  const glints: string[] = []

  // The sun's pale disc in the scene reads as the moon at night; this is its
  // light on the water below it, broken up by the swell.
  for (let i = 0; i < 11; i += 1) {
    const y = 484 + i * 11 + roll() * 6
    const half = 6 + i * 3 + roll() * 16
    const x = 1178 + (roll() - 0.5) * (10 + i * 5)
    glints.push(
      `<path d="M${(x - half).toFixed(0)},${y.toFixed(0)} h${(half * 2).toFixed(0)}" stroke="#e9efff" stroke-width="${(1.2 + roll() * 1.4).toFixed(1)}" stroke-linecap="round" opacity="${(0.2 + roll() * 0.3).toFixed(2)}"/>`,
    )
  }

  return (
    OPEN +
    NIGHT_VAR +
    '<g style="opacity:var(--night)">' +
    stars.join('') +
    glints.join('') +
    '</g></svg>'
  )
}

// A wisp of fog that drifts past the mountain: warm in the day's light, and a
// dim grey-blue at night, when the scene under it is darkened.
function fog(): string {
  const wisp = (id: string, color: string, strength: number): string =>
    `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${strength}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`
  const shapes =
    '<ellipse cx="800" cy="318" rx="210" ry="26"/><ellipse cx="700" cy="336" rx="150" ry="20"/><ellipse cx="930" cy="304" rx="130" ry="18"/>'

  return (
    OPEN +
    NIGHT_VAR +
    `<defs>${wisp('day', '#fdeedd', 0.75)}${wisp('dusk', '#7d8598', 0.4)}</defs>` +
    `<g fill="url(#day)" style="opacity:calc(1 - var(--night))">${shapes}</g>` +
    `<g fill="url(#dusk)" style="opacity:var(--night)">${shapes}</g>` +
    '</svg>'
  )
}

// A little sailing boat far out on the horizon.
function boat(): string {
  return (
    OPEN +
    '<g transform="translate(800,472)">' +
    '<path d="M-11,0 L11,0 L7,5 L-8,5 Z" fill="#3d4f66"/>' +
    '<path d="M0,-2 L0,-24 L10,-2 Z" fill="#f4ead9"/><path d="M-2,-2 L-2,-18 L-9,-2 Z" fill="#e4d6c2"/>' +
    '<path d="M-14,7 h30" stroke="#dfe9f2" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>' +
    '</g></svg>'
  )
}

// Three gulls gliding together; two drawings, wings up and wings down.
function gulls(isUp: boolean): string {
  const wing = isUp ? 'q-7,-9 -15,-5 M0,0 q7,-9 15,-5' : 'q-8,-1 -15,4 M0,0 q8,-1 15,4'
  const one = (x: number, y: number, k: number): string =>
    `<path transform="translate(${x},${y}) scale(${k})" d="M0,0 ${wing}" fill="none" stroke="#3b4658" stroke-width="2.4" stroke-linecap="round"/>`

  return OPEN + one(800, 176, 1) + one(846, 196, 0.8) + one(770, 208, 0.7) + '</svg>'
}

// What is left where the surfer went under: a burst of white water and the
// board tipping out of it. Drawn where the surfer stands at the break, and
// moved with the surfer's layer.
function splash(): string {
  const roll = dice(5)
  const drops: string[] = []

  for (let i = 0; i < 22; i += 1) {
    const a = Math.PI * (0.08 + roll() * 0.84)
    const d = 26 + roll() * 62
    drops.push(
      `<circle cx="${(1290 + Math.cos(a) * d).toFixed(0)}" cy="${(690 - Math.sin(a) * d).toFixed(0)}" r="${(2 + roll() * 5).toFixed(1)}" fill="#fff" opacity="${(0.6 + roll() * 0.4).toFixed(2)}"/>`,
    )
  }

  return (
    OPEN +
    '<path d="M1318,688 L1372,640 L1380,650 Z" fill="#fbfaf5"/><path d="M1318,688 L1380,650 L1376,656 Z" fill="#e8937a"/>' +
    '<ellipse cx="1290" cy="694" rx="62" ry="12" fill="#fff" opacity=".8"/>' +
    '<ellipse cx="1290" cy="682" rx="34" ry="20" fill="#fff" opacity=".9"/>' +
    drops.join('') +
    '</svg>'
  )
}

export const NIGHT_LAYER = night()
export const FOG_LAYER = fog()
export const BOAT_LAYER = boat()
export const GULL_LAYERS = [gulls(true), gulls(false)]
export const SPLASH_LAYER = splash()
