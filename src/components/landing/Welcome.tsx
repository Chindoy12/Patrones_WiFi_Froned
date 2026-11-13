import { useEffect, useState } from 'react';
import { CHAPTER_MS, CHAPTERS, nextChapter } from './chapters';
import type { Shape } from './stageProgress';

function prefersStill(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * The welcome: one full screen, no scrolling. The story plays by itself, one chapter every 6 seconds, and the scene
 * shows the shape of each chapter. Only the words and «Comenzar» are on screen (Avance 31: no dots or buttons that
 * flatten the picture). Hovering the words pauses the story, so it can be read slowly; for the keyboard, the pause
 * button appears when it gets the focus.
 *
 * With reduced motion the story does not advance by itself: a «Siguiente» link moves it. While it plays, the changes
 * are not announced to screen readers (that would interrupt them every few seconds); paused, they are.
 */
export function Welcome({ onShape, onStart }: { onShape: (shape: Shape) => void; onStart: () => void }) {
  const [index, setIndex] = useState(0);
  const still = prefersStill();
  const [paused, setPaused] = useState(still);
  const [hovered, setHovered] = useState(false);
  const playing = !paused && !hovered;
  const chapter = CHAPTERS[index];

  // the scene shows the shape of the chapter
  useEffect(() => {
    onShape(chapter.shape);
  }, [chapter.shape, onShape]);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setTimeout(() => setIndex(nextChapter), CHAPTER_MS);
    return () => window.clearTimeout(timer);
  }, [playing, index]);

  return (
    <section className="welcome" aria-label="Presentación de WiFiSense">
      <div className="welcome__chapter" key={index} aria-live={playing ? 'off' : 'polite'}
           onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
        <p className="welcome__label">{chapter.label}</p>
        <h1 className="welcome__title">{chapter.title}</h1>
        <p className="welcome__text">{chapter.text}</p>
      </div>

      <div className="welcome__controls">
        <button type="button" className="welcome__start" onClick={onStart}>
          Comenzar <span aria-hidden="true">→</span>
        </button>
        {still ? (
          <button type="button" className="welcome__next" onClick={() => setIndex(nextChapter)}>
            Siguiente <span className="sr-only">({index + 1} de {CHAPTERS.length})</span>
          </button>
        ) : (
          <button type="button" className="welcome__pause" onClick={() => setPaused((p) => !p)}>
            {paused ? 'Seguir la presentación' : 'Pausar la presentación'}
          </button>
        )}
      </div>

      {!still && <p className="welcome__hint">Mueve el mouse o toca la pantalla: los triángulos te responden.</p>}
    </section>
  );
}
