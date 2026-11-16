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
- The desktop app holds CSS and SMIL animation still in a scene this detailed, so the surfer moves like a flipbook: a timer redraws a small top layer about 7 times a second. Redraws can make the window jump, so the surfer rides one pass about once a minute and waits at the break in between, and only one open session animates at a time.
- Remove it with `/plugin uninstall nami-waves`.
