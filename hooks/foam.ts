// The whitewater that follows the surfer: a band of foam whose front edge sits
// just behind the board and which runs on far to the right, so that as its
// layer slides left with the surfer the broken part of the wave stays white.
// Drawn in the scene's own coordinates, inside a nested svg that takes the left
// half of a layer twice the window's width and lets the band spill past it.

const FRONT = 1345
const END = 3100
const TOP = 618
const FOOT = 714

// A small fixed-seed generator, so the foam is the same drawing every time.
function dice(seed: number): () => number {
  let s = seed

  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296

    return s / 4294967296
  }
}

function build(): string {
  const roll = dice(7)
  const n = (v: number): string => v.toFixed(0)
  const parts: string[] = []

  // The body of the band, with a soft shadow along its foot.
  parts.push(
    `<rect x="${FRONT + 14}" y="${TOP}" width="${END - FRONT}" height="${FOOT - TOP}" rx="26" fill="#eef4f8" opacity=".94"/>`,
    `<rect x="${FRONT + 26}" y="${FOOT - 20}" width="${END - FRONT}" height="22" rx="11" fill="#a9c3d8" opacity=".75"/>`,
  )
  // Lumps along the top edge.
  for (let x = FRONT + 20; x < END; x += 22 + roll() * 14) {
    parts.push(`<circle cx="${n(x)}" cy="${n(TOP + roll() * 10 - 4)}" r="${n(13 + roll() * 11)}" fill="#fff"/>`)
  }
  // Blue-grey hollows inside the band.
  for (let x = FRONT + 60; x < END; x += 46 + roll() * 50) {
    parts.push(
      `<ellipse cx="${n(x)}" cy="${n(TOP + 34 + roll() * 40)}" rx="${n(16 + roll() * 22)}" ry="${n(5 + roll() * 6)}" fill="#c3d6e5" opacity=".7"/>`,
    )
  }
  // The tumbling front edge, and a little spray thrown ahead of it.
  for (let i = 0; i < 16; i += 1) {
    parts.push(
      `<circle cx="${n(FRONT + roll() * 44)}" cy="${n(TOP + 4 + roll() * (FOOT - TOP - 14))}" r="${n(12 + roll() * 15)}" fill="#fff"/>`,
    )
  }
  for (let i = 0; i < 9; i += 1) {
    parts.push(
      `<circle cx="${n(FRONT - 8 - roll() * 34)}" cy="${n(TOP - 18 + roll() * 46)}" r="${n(2 + roll() * 4)}" fill="#fff" opacity=".85"/>`,
    )
  }

  return parts.join('')
}

export const FOAM_LAYER =
  '<svg xmlns="http://www.w3.org/2000/svg">' +
  '<svg width="50%" height="100%" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" overflow="visible">' +
  build() +
  '</svg></svg>'
