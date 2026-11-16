# Nami Waves

A Claude Code theme for the desktop and mobile apps: a sunset surf break below a fog-wrapped mountain, a sandy beach, and a little orange pixel character gliding along the wave. The interface colors (surfaces, text, accents) are tuned to the scene, in light and dark mode.

The terminal and editors don't draw themes, so there the mod does nothing.

## Install

At the prompt of a terminal session:

```
/plugin install nami-waves --marketplace shohammezan55-code/claude-surf-theme
```

Answer `y` to add the marketplace, then pick the user scope so the theme applies in every session.

From a shell:

```bash
claude plugin install nami-waves --marketplace shohammezan55-code/claude-surf-theme
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `shohammezan55-code/claude-surf-theme`, then Add plugin.

## Notes

- The background is a vector scene (no images), kept under about 120,000 characters so the desktop app draws it.
- The surfer moves in steps, twice a second, carving up and down the wave for one ride, then waits at the break for half a minute. The scene and the surfer (one frame per lean) never change; a step only shifts the surfer's frame and picks which lean shows, so nothing reloads.
- Remove it with `/plugin uninstall nami-waves`.
