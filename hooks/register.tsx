import type { Register, ThemeSetArgs, Timer } from 'claude-code'

import { FOAM_LAYER } from './foam.ts'
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
// most twice a second, so the surfer moves in steps. Both layers are frames
// with content that never changes, which the app keeps in place across
// redraws; a step only moves the surfer's layer sideways (its Box offset), so
// nothing is reloaded or swapped and the scene doesn't flicker.
const STEP_MS = 500
const STEPS = 26
// The whole ride, in the Box's offset units (character cells).
const RUN_COLUMNS = 108
const REST_STEPS = 60
const CARVES = 5
let ticker: Timer | undefined
let step = 0
let rest = 0

// The surfer carves up and down the face as it goes. Its lean can't be redrawn
// without a flicker, so there is one unchanging layer per lean and a step shows
// the one that fits.
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

// Where the surfer is on a step: columns left, rows down, and which lean.
function pose(n: number): { left: number; top: number; lean: number } {
  const t = n / STEPS
  const angle = 2 * Math.PI * CARVES * t
  const slope = Math.cos(angle)

  return {
    left: -Math.round(RUN_COLUMNS * t),
    top: Math.round(Math.sin(angle) + t),
    lean: n === 0 ? 1 : slope > 0.4 ? 2 : slope < -0.4 ? 0 : 1,
  }
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
      if (rest > 0) {
        rest -= 1
        return
      }
      step = (step + 1) % (STEPS + 1)
      if (step === 0) {
        rest = REST_STEPS
      }
      $.ui.invalidate('ui.render')
    })

    // A reload can run before the window attaches; keep the status line clear.
    $.ui.status(undefined)

    if (!set.isDrawn) {
      $.ui.log(`nami-waves: ${set.reason}`)
    }

    return next(e)
  })

  // The still scene underneath, then the foam and the surfer's layers on top,
  // moved left a little further on each step.
  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.scene !== 'nami-layers' || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const { Box, Svg } = $.ui.resolve(e)
    const { left, top, lean } = pose(step)

    return (
      <Box position="relative" width="100%" height="100%">
        <Svg isInteractive source={SCENE} alt="A sunset surf break and sandy beach below a fog-wrapped mountain" />
        <Box position="absolute" top={step > STEPS / 2 ? 1 : 0} left={left} width="200%" height="100%">
          <Svg isInteractive source={FOAM_LAYER} alt="Whitewater following the surfer along the wave" />
        </Box>
        {RIDER_LAYERS.map((source, i) => (
          <Box
            position="absolute"
            top={top}
            left={left}
            width="100%"
            height="100%"
            display={i === lean ? 'flex' : 'none'}
          >
            <Svg isInteractive source={source} alt="A little orange pixel character carving the wave" />
          </Box>
        ))}
      </Box>
    )
  })
}
