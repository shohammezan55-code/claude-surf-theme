import type { Register, ThemeSetArgs, Timer } from 'claude-code'

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

// The app holds animation still in this backdrop, so the surfer moves like a
// flipbook: a redraw is asked for, and the hook draws the rider where it should
// be at that moment. The scene is drawn as a frame, which the app keeps across
// redraws; only the small surfer image is swapped.
//
// A redraw is a round trip to the app. Asking for the next one before the last
// was drawn makes the app drop the answers, decide nothing draws the backdrop
// and blank it for a moment, about twice a second. So the next redraw is only
// asked for once the hook has drawn the last one, and the pose comes from the
// clock, which keeps the surfer's speed the same however fast redraws go.
const PASS_MS = 18 * 1000
const REST_MS = 30 * 1000
const TICK_MS = 60
const SETTLE_MS = 110
const MIN_GAP_MS = 200
const GIVE_UP_MS = 3000
let ticker: Timer | undefined
// Time by counting ticks: the module has no clock of its own to read in a hook.
let clockMs = 0
let passStart = 0
let askedAt = 0
let drawnAt = 0
let isAsked = false

const RUN = 1050
const CARVES = 5

// How far along the pass the surfer is, 0 at the break; 0 while it rests.
function progress(now: number): number {
  const t = (now - passStart) / PASS_MS

  return t > 0 && t < 1 ? t : 0
}

function riderLayer(t: number): string {
  const wave = Math.sin(2 * Math.PI * CARVES * t)
  const x = 1250 - RUN * t
  const y = 620 + 30 * t + 14 * wave
  const tilt = 10 * Math.cos(2 * Math.PI * CARVES * t) - 13
  // It waits at the break in full view, so it only fades out at the far end.
  const fade = Math.max(0.05, Math.min(1, (1 - t) / 0.06))
  const r = (v: number): string => v.toFixed(1)

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">' +
    RIDER_DEFS +
    `<g opacity="${fade.toFixed(2)}" transform="translate(${r(x)},${r(y)}) rotate(${r(tilt)} 40 60)">` +
    RIDER +
    '</g></svg>'
  )
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
    passStart = clockMs
    isAsked = false
    ticker = $.clock.every(TICK_MS, () => {
      clockMs += TICK_MS
      const now = clockMs

      if (now < passStart) {
        return
      }
      // Still waiting for the last redraw to be drawn, or it only just was.
      if (isAsked && now - askedAt < GIVE_UP_MS) {
        return
      }
      if (now - drawnAt < SETTLE_MS || now - askedAt < MIN_GAP_MS) {
        return
      }
      if (now - passStart >= PASS_MS) {
        // The pass is over: one last redraw puts it back at the break to rest.
        passStart = now + REST_MS
      }
      isAsked = true
      askedAt = now
      $.ui.invalidate('ui.render')
    })

    // A reload can run before the window attaches; keep the status line clear.
    $.ui.status(undefined)

    if (!set.isDrawn) {
      $.ui.log(`nami-waves: ${set.reason}`)
    }

    return next(e)
  })

  // Two layers: the still scene underneath, as a frame the app keeps across
  // redraws, and a small top layer redrawn with the surfer in each new pose.
  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.scene !== 'nami-layers' || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const { Box, Svg } = $.ui.resolve(e)
    const now = clockMs

    drawnAt = now
    isAsked = false

    return (
      <Box position="relative" width="100%" height="100%">
        <Svg isInteractive source={SCENE} alt="A sunset surf break and sandy beach below a fog-wrapped mountain" />
        <Box position="absolute" top={0} left={0} right={0} bottom={0}>
          <Svg source={riderLayer(progress(now))} alt="A little orange pixel character carving the wave" />
        </Box>
      </Box>
    )
  })
}
