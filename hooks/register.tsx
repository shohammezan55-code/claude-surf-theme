import type { EngineInterface, Register, ThemeSetArgs, Timer } from 'claude-code'

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

// The app holds animation still in this scene, so the surfer moves like a
// flipbook: a timer steps `frame` and asks for a redraw of the small top layer
// with the rider in a new pose. The scene underneath never changes.
const FRAMES = 140
const STEP_MS = 130
let frame = 0
let ticker: Timer | undefined
let lease: Timer | undefined

// The animation lease, shared by every session through the store.
const LEASE_KEY = 'animator'
const LEASE_RENEW_MS = 2000
const LEASE_STALE_MS = 6000
const me = Math.random().toString(36).slice(2)
let leading = false

async function claimLease($: EngineInterface): Promise<void> {
  try {
    const now = await $.clock.now()
    const held = (await $.store.get(LEASE_KEY)) as { id?: string; at?: number } | undefined
    const free = held?.id === undefined || held.id === me || now - (held.at ?? 0) > LEASE_STALE_MS

    if (free) {
      await $.store.set(LEASE_KEY, { id: me, at: now })
      const after = (await $.store.get(LEASE_KEY)) as { id?: string } | undefined
      leading = after?.id === me
    } else {
      leading = false
    }
  } catch {
    leading = false
  }
}

// One pass along the whole wave: from the break on the right to the far end on
// the left, carving up and down the face five times, fading in and out at the
// ends so the restart at the break doesn't jump.
const RUN = 1050
const CARVES = 5

function pose(n: number): { x: number; y: number; tilt: number; fade: number } {
  const t = (n % FRAMES) / FRAMES
  const wave = Math.sin(2 * Math.PI * CARVES * t)

  return {
    x: -RUN * t,
    y: 30 * t + 14 * wave,
    tilt: 10 * Math.cos(2 * Math.PI * CARVES * t),
    // Never fully transparent: a frame with nothing visible on the top layer
    // made the app drop the whole backdrop for a frame at the loop's restart.
    fade: Math.max(0.05, Math.min(1, (t + 1 / FRAMES) / 0.06, (1 - t) / 0.06)),
  }
}

function riderLayer(n: number): string {
  const { x, y, tilt, fade } = pose(n)
  const r = (v: number): string => v.toFixed(1)

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">' +
    RIDER_DEFS +
    `<g opacity="${fade.toFixed(2)}"transform="translate(${r(1250 + x)},${r(620 + y)}) rotate(${r(tilt - 13)} 40 60)">` +
    RIDER +
    '</g></svg>'
  )
}

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

    // Every open session runs this mod, and each redraw of the backdrop can
    // repaint the whole window, so only one session at a time animates: the one
    // holding a lease in the shared store, renewed every couple of seconds and
    // taken over by another session once it goes stale.
    ticker?.cancel()
    lease?.cancel()
    await claimLease($)
    // A session that starts before its window attaches isn't drawn, and the app
    // then showed its default backdrop; set the look again until it draws.
    let drawn = set.isDrawn
    lease = $.clock.every(LEASE_RENEW_MS, () => {
      void claimLease($)
      if (!drawn) {
        void $.theme.set(LOOK).then(again => {
          drawn = again.isDrawn
        })
      }
    })
    ticker = $.clock.every(STEP_MS, () => {
      if (!leading) {
        return
      }
      frame = (frame + 1) % FRAMES
      $.ui.invalidate('ui.render')
    })

    // A reload can run before the window attaches; keep the status line clear.
    $.ui.status(undefined)

    if (!set.isDrawn) {
      $.ui.log(`nami-waves: ${set.reason}`)
    }

    return next(e)
  })

  // Two layers: the still scene underneath, and a small top layer redrawn with
  // the surfer in each new pose.
  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.scene !== 'nami-layers' || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const { Box, Svg } = $.ui.resolve(e)

    return (
      <Box position="relative" width="100%" height="100%">
        <Svg source={SCENE} alt="A sunset surf break and sandy beach below a fog-wrapped mountain" />
        <Box position="absolute" top={0} left={0} right={0} bottom={0}>
          <Svg source={riderLayer(frame)} alt="A little orange pixel character carving the wave" />
        </Box>
      </Box>
    )
  })
}
