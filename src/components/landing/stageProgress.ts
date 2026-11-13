/**
 * Which shape the start page shows for a scroll position, and where on the screen it goes. Plain functions so they can
 * be tested without a browser.
 *
 * The stage is a number: 0 is the Wi-Fi symbol, 1 the points scattered, 2 the router and 3 the planet; 0.5 is halfway
 * between the Wi-Fi symbol and the scattered points. Each section of the page says which stage it shows; between two
 * sections the stage moves in proportion to the scroll, so the shape follows the reader's finger.
 */

export const STAGE = { wifi: 0, scatter: 1, router: 2, planet: 3 } as const;
export const LAST_STAGE = STAGE.planet;

export interface Anchor {
  /** Where the middle of the section is, in page pixels. */
  at: number;
  stage: number;
}

/** The stage when the middle of the screen is at `y` (page pixels), between the anchors of the sections. */
export function stageAt(y: number, anchors: Anchor[]): number {
  if (anchors.length === 0) return 0;
  const sorted = [...anchors].sort((a, b) => a.at - b.at);
  if (y <= sorted[0].at) return sorted[0].stage;
  for (let i = 1; i < sorted.length; i += 1) {
    const a = sorted[i - 1];
    const b = sorted[i];
    if (y <= b.at) {
      const t = (y - a.at) / Math.max(1, b.at - a.at);
      return a.stage + (b.stage - a.stage) * t;
    }
  }
  return sorted[sorted.length - 1].stage;
}
