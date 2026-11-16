import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
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

const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: 'nami', glass: { blur: 1, opacity: 0.4 } },
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    const set = await $.theme.set(LOOK)

    // A reload can run before the window attaches; keep the status line clear.
    $.ui.status(undefined)

    if (!set.isDrawn) {
      $.ui.log(`nami-waves: ${set.reason}`)
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.scene !== 'nami' || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    return <Svg source={SCENE} alt="A sunset surf break and sandy beach below a fog-wrapped mountain, with a little orange pixel character carving the wave" isInteractive />
  })
}
