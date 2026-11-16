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

// The surfer rides in its own small drawing on top of the scene and animates
// itself (SMIL), so the app never redraws anything: redrawing the backdrop made
// the whole scene drop out for a moment a couple of times a second.
// One pass along the wave takes PASS_S seconds, then it waits REST_S seconds.
const PASS_S = 18
const REST_S = 30
const STEPS = 72
const RUN = 1050
const CARVES = 5

function pose(t: number): { x: number; y: number; tilt: number; fade: number } {
  const wave = Math.sin(2 * Math.PI * CARVES * t)

  return {
    x: 1250 - RUN * t,
    y: 620 + 30 * t + 14 * wave,
    tilt: 10 * Math.cos(2 * Math.PI * CARVES * t) - 13,
    fade: Math.max(0, Math.min(1, t / 0.04, (1 - t) / 0.04)),
  }
}

function riderLayer(): string {
  const total = PASS_S + REST_S
  const r = (v: number): string => v.toFixed(1)
  const times: string[] = []
  const moves: string[] = []
  const turns: string[] = []
  const fades: string[] = []

  for (let i = 0; i <= STEPS; i += 1) {
    const t = i / STEPS
    const p = pose(t)
    times.push(((t * PASS_S) / total).toFixed(4))
    moves.push(`${r(p.x)} ${r(p.y)}`)
    turns.push(`${r(p.tilt)} 40 60`)
    fades.push(p.fade.toFixed(2))
  }
  // Hold at the start of the next pass, out of sight, through the rest.
  const start = pose(0)
  times.push('1')
  moves.push(`${r(start.x)} ${r(start.y)}`)
  turns.push(`${r(start.tilt)} 40 60`)
  fades.push('0')

  const anim = (attr: string, values: string[], type?: string): string =>
    (type === undefined ? `<animate attributeName="${attr}"` : `<animateTransform attributeName="transform" type="${type}"`) +
    ` dur="${total}s" repeatCount="indefinite" calcMode="linear" keyTimes="${times.join(';')}" values="${values.join(';')}"/>`

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">' +
    RIDER_DEFS +
    `<g opacity="0">${anim('opacity', fades)}` +
    `<g>${anim('', moves, 'translate')}` +
    `<g>${anim('', turns, 'rotate')}` +
    RIDER +
    '</g></g></g></svg>'
  )
}

const RIDER_LAYER = riderLayer()

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

    // A reload can run before the window attaches; keep the status line clear.
    $.ui.status(undefined)

    if (!set.isDrawn) {
      $.ui.log(`nami-waves: ${set.reason}`)
    }

    return next(e)
  })

  // Two layers: the still scene underneath, and a small top layer where the
  // surfer animates on its own.
  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.scene !== 'nami-layers' || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const { Box, Svg } = $.ui.resolve(e)

    return (
      <Box position="relative" width="100%" height="100%">
        <Svg source={SCENE} alt="A sunset surf break and sandy beach below a fog-wrapped mountain" />
        <Box position="absolute" top={0} left={0} right={0} bottom={0}>
          <Svg source={RIDER_LAYER} alt="A little orange pixel character carving the wave" />
        </Box>
      </Box>
    )
  })
}
