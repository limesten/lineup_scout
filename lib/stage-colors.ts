// Per-stage color theming.
//
// Each stage gets its own hue, used as a translucent background for performance
// blocks (timetable / vertical views) and cards (grid view). Well-known
// Tomorrowland stages have hand-picked hues so the colors feel intentional;
// any unknown stage falls back to a deterministic hue derived from its name so
// it still gets a stable, distinct color across renders and views.

export interface StageColor {
    /** Translucent fill for block / card backgrounds. */
    background: string;
    /** Opaque fill used on hover so overlapping blocks don't bleed through. */
    backgroundSolid: string;
    /** Slightly more opaque tone for borders. */
    border: string;
}

// Hand-picked hues (0-360) for known stages.
const KNOWN_STAGE_HUES: Record<string, number> = {
    MAINSTAGE: 288,
    "THE RAVE CAVE": 25,
    CORE: 265,
    "HOUSE OF FORTUNE BY JBL": 48,
    "FREEDOM BY BUD": 140,
    CAGE: 0,
    "CRYSTAL GARDEN": 190,
    "MELODIA BY CORONA": 162,
    "THE ROSE GARDEN": 350,
    "RISE BY COCA-COLA": 8,
    "THE GREAT LIBRARY": 40,
    ELIXIR: 320,
    PLANAXIS: 205,
    ATMOSPHERE: 232,
    MOOSEBAR: 95,
    "CELESTIA BY KUCOIN": 220,
};

// Spread-out hues used for stages not in the known map.
const FALLBACK_HUES = [12, 52, 110, 130, 175, 200, 248, 278, 300, 332];

function hashStageName(name: string): number {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    }
    return hash;
}

export function getStageColor(stageName: string): StageColor {
    const hue =
        KNOWN_STAGE_HUES[stageName] ??
        FALLBACK_HUES[hashStageName(stageName) % FALLBACK_HUES.length];

    return {
        background: `hsl(${hue} 65% 45% / 0.22)`,
        // Opaque tone roughly matching the translucent fill composited over the
        // dark page background, so hovering removes transparency cleanly.
        backgroundSolid: `hsl(${hue} 45% 16%)`,
        border: `hsl(${hue} 60% 60% / 0.55)`,
    };
}
