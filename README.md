# Matilda Valley

A 3D exploration game built with React Three Fiber. A data blackout has silenced Matilda. Explore the valley, collect data fragments, and solve three puzzles to restore the memory shards and bring the core back online.

Built with Matilda Desktop. Matilda Desktop was used as the development environment; the game itself runs entirely in the browser and does not require Matilda, a backend, analytics, or a hosted model.

## Gameplay

- Explore a procedural valley with day/night cycle, water, terrain, and vegetation
- Collect 9 data fragments (3 per shard) scattered across the world
- Solve three puzzles to restore each memory shard:
  - **Signal Align** - Align mirrors to redirect a signal beam
  - **Resonance Bloom** - Match tuning forks to the target harmonic pitches
  - **Memory Matrix** - Observe and replay a pattern sequence
- Restore all three shards at the core to win

## Controls

| Key | Action |
| --- | --- |
| WASD | Move |
| Mouse | Look around |
| Shift | Sprint |
| Space | Jump |
| E | Interact (collect fragments, start puzzles) |
| ESC | Pause |

## Development

```bash
npm install
npm run dev
```

Open the Vite dev server URL (typically `http://localhost:5173`).

## Build

```bash
npm run build     # type-check (tsc -b) then bundle (vite build)
npm run preview   # serve the production build locally
npm run lint      # oxlint
```

## Tech Stack

- **React 19** with TypeScript 6
- **Vite 8** build tooling
- **React Three Fiber 9** + **Three.js 0.185** for 3D rendering
- **@react-three/drei 10** for helpers (sky, textures, etc.)
- **@react-three/postprocessing 3** for bloom and vignette effects
- **Zustand 5** for game state management
- **simplex-noise 4** for procedural terrain generation
- **oxlint** for linting
- **Web Audio API** for procedural ambient audio and SFX (no audio files)

## Project Structure

```
src/
  App.tsx              # Root component, canvas, overlays, HUD
  store.ts             # Zustand game state (phase, shards, fragments)
  constants.ts         # World size, physics, colours, puzzle positions
  main.tsx             # Entry point
  components/
    World.tsx          # Terrain, sky, lighting, day/night cycle
    Player.tsx         # Movement, collision, interaction raycasting
    Avatar.tsx         # Player model (toon-shaded robot with wattle mark)
    Core.tsx           # Central restoration core at valley centre
    DataFragments.tsx  # Collectible fragment spawning and pickup
    Waypoints.tsx      # Puzzle waypoint markers
    PathBeacons.tsx    # Light-path guides between points of interest
    AmbientStructures.tsx  # Decorative ruins and structures
    Vegetation.tsx     # Procedural trees and grass
    Footprints.tsx     # Player footprint trail
    SpawnPad.tsx       # Spawn point marker
    RestorationEffects.tsx  # Particle effects on shard restoration
  puzzles/
    SignalAlign.tsx    # Mirror alignment puzzle
    ResonanceBloom.tsx # Tone sequence puzzle
    MemoryMatrix.tsx   # Pattern memory puzzle
  lib/
    Audio.ts           # Procedural Web Audio (wind, birds, water, SFX)
    playerState.ts     # Per-frame player telemetry (mutable singleton)
    avatarState.ts     # Per-frame avatar animation state
    environmentState.ts  # Day/night cycle state (mutable singleton)
    camera.ts          # Third-person camera controller
    collision.ts       # Terrain height queries and collision
    footprints.ts      # Footprint tracking logic
    fragments.ts       # Fragment placement and lore data
    interaction.ts     # Proximity interaction system
    terrain.ts         # Procedural terrain heightmap
    textures.ts        # Procedural canvas textures
    toon.ts            # Toon shading gradient map
```

## Game State

State is managed with Zustand. The game cycles through four phases:
`intro` -> `playing` -> `paused` / `won`

Each shard requires 3 data fragments to unlock its puzzle. Solving a puzzle marks the shard as restored. When all three shards are restored, the game enters the `won` phase.

The day/night cycle runs on a 300-second loop and pauses when the game is paused. Night lighting is tuned to stay readable while preserving the avatar's self-lit wattle mark glow.

## License

The source code is licensed under the Apache License 2.0. The Matilda name and logo are Maincode brand assets and are not granted for use beyond reasonable attribution. See `NOTICE`.
