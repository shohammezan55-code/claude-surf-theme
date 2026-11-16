// The whitewater that follows the surfer: a band of foam whose front edge sits
// just behind the board and which runs on far to the right, so that as its
// layer slides left with the surfer the broken part of the wave stays white.
// Drawn in the scene's own coordinates, inside a nested svg that takes the left
// half of a layer twice the window's width and lets the band spill past it.

const FRONT = 1345
const END = 3100
const TOP = 648
const FOOT = 704

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
    `<rect x="${FRONT + 14}" y="${TOP}" width="${END - FRONT}" height="${FOOT - TOP}" rx="20" fill="#eef4f8" opacity=".72"/>`,
    `<rect x="${FRONT + 26}" y="${FOOT - 10}" width="${END - FRONT}" height="12" rx="6" fill="#a9c3d8" opacity=".5"/>`,
  )
  // Lumps along the top edge.
  for (let x = FRONT + 20; x < END; x += 20 + roll() * 16) {
    parts.push(`<circle cx="${n(x)}" cy="${n(TOP + roll() * 8 - 2)}" r="${n(6 + roll() * 7)}" fill="#fff" opacity=".85"/>`)
  }
  // Blue-grey hollows inside the band.
  for (let x = FRONT + 60; x < END; x += 70 + roll() * 70) {
    parts.push(
      `<ellipse cx="${n(x)}" cy="${n(TOP + 18 + roll() * 22)}" rx="${n(12 + roll() * 16)}" ry="${n(3 + roll() * 3)}" fill="#c3d6e5" opacity=".7"/>`,
    )
  }
  // The tumbling front edge, and a little spray thrown ahead of it.
  for (let i = 0; i < 9; i += 1) {
    parts.push(
      `<circle cx="${n(FRONT + 4 + roll() * 30)}" cy="${n(TOP + 4 + roll() * (FOOT - TOP - 10))}" r="${n(7 + roll() * 9)}" fill="#fff" opacity=".9"/>`,
    )
  }
  for (let i = 0; i < 5; i += 1) {
    parts.push(
      `<circle cx="${n(FRONT - 8 - roll() * 34)}" cy="${n(TOP - 12 + roll() * 30)}" r="${n(2 + roll() * 3)}" fill="#fff" opacity=".85"/>`,
    )
  }

  return parts.join('')
}

export const FOAM_LAYER =
  '<svg xmlns="http://www.w3.org/2000/svg">' +
  '<svg width="50%" height="100%" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" overflow="visible">' +
  build() +
  '</svg></svg>'
