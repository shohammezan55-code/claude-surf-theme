import type { Register, ThemeSetArgs, Timer } from 'claude-code'

import { BEACH_LAYER, BOAT_LAYER, FOG_LAYER, GULL_LAYERS, NIGHT_LAYER, SPLASH_LAYER } from './life.ts'
import { makeColors } from './make-colors.js'
import { RIDER, RIDER_DEFS } from './motion.ts'
import { SCENE } from './scene.ts'

// A hazy sunset surf break traced from a photo, with a pixel surfer; colors from the sky and the sea.
const { theme, problems } = makeColors({
  label: 'Nami',
  roles: { accent: '#2a7f93', danger: '#b5402f', success: '#3f7f5a', warning: '#b07a1e', pro: '#5e5aa8' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#efe4d4',
        'surface-1': '#f5ecdf',
        'surface-2': '#faf5ec',
        'text-primary': '#1d2a35',
        'text-secondary': '#3b4955',
        'text-muted': '#55626d',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#08171f',
        'surface-1': '#0d1f29',
        'surface-2': '#122833',
        'surface-3': '#17303c',
        'text-primary': '#e8efef',
        'text-secondary': '#c2d1d4',
        'text-muted': '#98abb0',
      },
    },
  },
})

// The app holds animation still in this backdrop and draws a change to it at
// most twice a second, so everything here moves in steps. Every layer is a
// frame with content that never changes, which the app keeps in place across
// redraws; a step only slides a layer (its Box offset) or shows and hides one,
// so nothing is reloaded or swapped and the scene doesn't flicker.
const STEP_MS = 500
// The width of the scene in the Box's offset units (character cells), near enough.
const SCENE_COLUMNS = 183
const CARVES_PER_RIDE = 5

// The surfer rides while Claude works: ride after ride, with a short wait at
// the break between them. When Claude has finished and is waiting for you, it
// stands on the beach with the board beside it. A finished turn gets a little
// hop on the way; one that ends in an error, a wipeout.
type Mode = 'beach' | 'ride' | 'pause' | 'wipeout'
type Ride = { steps: number; columns: number; carves: number }

const RIDES: readonly Ride[] = [
  { steps: 26, columns: 108, carves: CARVES_PER_RIDE },
  { steps: 26, columns: 108, carves: CARVES_PER_RIDE },
  { steps: 19, columns: 78, carves: 4 },
  { steps: 13, columns: 52, carves: 2 },
]

let ticker: Timer | undefined
let mode: Mode = 'beach'
let ride: Ride = RIDES[0] as Ride
let step = 0
let wait = 0
let hop = 0
let isWorking = false

const between = (low: number, high: number): number => low + Math.floor(Math.random() * (high - low + 1))

function startRide(): void {
  ride = RIDES[between(0, RIDES.length - 1)] as Ride
  mode = 'ride'
  step = 0
}

// One step of the surfer; true when what is drawn changed.
function stepSurfer(): boolean {
  if (hop > 0) {
    hop -= 1
  }
  if (mode === 'ride') {
    step += 1
    if (step > ride.steps) {
      step = 0
      mode = isWorking ? 'pause' : 'beach'
      wait = between(3, 8)
    }

    return true
  }
  if (mode === 'wipeout' || mode === 'pause') {
    wait -= 1
    if (wait > 0 && (isWorking || mode === 'wipeout')) {
      return false
    }
    step = 0
    if (isWorking) {
      startRide()
    } else {
      mode = 'beach'
    }

    return true
  }
  // On the beach.
  if (isWorking) {
    startRide()

    return true
  }

  return false
}

// The surfer's lean can't be redrawn without a flicker, so there is one
// unchanging layer per lean and a step shows the one that fits.
const LEANS = [-23, -13, -3]

function riderLayer(lean: number): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">' +
    RIDER_DEFS +
    `<g transform="translate(1250,620) rotate(${lean} 40 60)">` +
    RIDER +
    '</g></svg>'
  )
}

const RIDER_LAYERS = LEANS.map(riderLayer)

// Where the surfer is: columns left, rows down, and which lean.
function pose(): { left: number; top: number; lean: number } {
  const t = step / ride.steps
  const height = Math.sin(2 * Math.PI * ride.carves * t)
  const drop = (t * ride.columns) / 108
  const isAtBreak = step === 0

  return {
    left: -Math.round(ride.columns * t),
    top: Math.round(isAtBreak ? 0 : height + drop) - (hop > 0 ? 2 : 0),
    // Nose down at the top of the face, about to drop in; level at the bottom.
    lean: isAtBreak ? 1 : hop > 0 ? 2 : height < -0.3 ? 0 : height > 0.3 ? 2 : 1,
  }
}

// The rest of the life in the scene: each drifts across on its own clock.
// Offsets run from one edge of the scene to the other, past both.
const EDGE = Math.round(SCENE_COLUMNS / 2) + 12
let clock = 0
let fogAt = 30
let boatAt = -40
let gullsAt = EDGE
let gullsIn = 120

function stepLife(): boolean {
  let changed = false

  clock += 1
  if (clock % 5 === 0) {
    fogAt = fogAt <= -EDGE - 20 ? EDGE + 20 : fogAt - 1
    changed = true
  }
  if (clock % 9 === 0) {
    boatAt = boatAt <= -EDGE ? EDGE : boatAt - 1
    changed = true
  }
  if (gullsIn > 0) {
    gullsIn -= 1
    if (gullsIn === 0) {
      gullsAt = EDGE
    }
  } else {
    gullsAt -= 2
    changed = true
    if (gullsAt < -EDGE) {
      gullsIn = between(360, 720)
    }
  }

  return changed
}

let retry: Timer | undefined

const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: 'nami-layers', glass: { blur: 1, opacity: 0.4 } },
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    const set = await $.theme.set(LOOK)

    // A session that starts before its window attaches isn't drawn, and the app
    // then showed its default backdrop; set the look again a few times.
    retry?.cancel()
    let drawn = set.isDrawn
    let tries = 8
    retry = $.clock.every(2000, () => {
      if (drawn || tries <= 0) {
        retry?.cancel()
        return
      }
      tries -= 1
      void $.theme.set(LOOK).then(again => {
        drawn = again.isDrawn
      })
    })

    ticker?.cancel()
    ticker = $.clock.every(STEP_MS, () => {
      const surfer = stepSurfer()
      const life = stepLife()

      if (surfer || life) {
        $.ui.invalidate('ui.render')
      }
    })

    // A reload can run before the window attaches; keep the status line clear.
    $.ui.status(undefined)

    if (!set.isDrawn) {
      $.ui.log(`nami-waves: ${set.reason}`)
    }

    return next(e)
  })

  // The surfer follows the main conversation's turns, not a subagent's.
  on('turn.start', ($, e, next) => {
    if (e.agentId === undefined) {
      isWorking = true
    }

    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined) {
      isWorking = false
      if (mode === 'ride' && (e.reason === 'error' || e.reason === 'refusal')) {
        mode = 'wipeout'
        wait = 5
      } else if (mode === 'ride' && e.reason === 'answer') {
        hop = 2
      }
      $.ui.invalidate('ui.render')
    }

    return next(e)
  })

  // The still scene underneath, then everything that moves, each in its own
  // layer: slid across by its offset, or shown and hidden.
  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.scene !== 'nami-layers' || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const { Box, Svg } = $.ui.resolve(e)
    const { left, top, lean } = pose()
    const isUnder = mode === 'wipeout'
    const isOnBeach = mode === 'beach'
    const areGullsOut = gullsIn === 0
    const layer = (
      source: string,
      alt: string,
      at: { left?: number; top?: number; isShown?: boolean } = {},
    ) => (
      <Box
        position="absolute"
        top={at.top ?? 0}
        left={at.left ?? 0}
        width="100%"
        height="100%"
        display={at.isShown === false ? 'none' : 'flex'}
      >
        <Svg isInteractive source={source} alt={alt} />
      </Box>
    )

    return (
      <Box position="relative" width="100%" height="100%">
        <Svg isInteractive source={SCENE} alt="A sunset surf break and sandy beach below a fog-wrapped mountain" />
        {layer(NIGHT_LAYER, 'Stars, and moonlight on the water')}
        {layer(FOG_LAYER, 'A wisp of fog drifting past the mountain', { left: fogAt })}
        {layer(BOAT_LAYER, 'A small sailing boat on the horizon', { left: boatAt })}
        {GULL_LAYERS.map((source, i) =>
          layer(source, 'Three gulls gliding over the sea', {
            left: gullsAt,
            isShown: areGullsOut && (clock % 2 === 0) === (i === 0),
          }),
        )}
        {RIDER_LAYERS.map((source, i) =>
          layer(source, 'A little orange pixel character carving the wave', {
            left,
            top,
            isShown: !isUnder && !isOnBeach && i === lean,
          }),
        )}
        {layer(BEACH_LAYER, 'The little orange character waiting on the beach, board in hand', { isShown: isOnBeach })}
        {layer(SPLASH_LAYER, 'A splash where the surfer went under', { left, top, isShown: isUnder })}
      </Box>
    )
  })
}
