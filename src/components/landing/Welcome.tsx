import { useEffect, useRef, useState } from 'react';
import { CHAPTER_MS, CHAPTERS, nextChapter } from './chapters';
import { stepFor } from './stageProgress';

function prefersStill(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * The welcome (Avance 29): one full screen, no scrolling. The story plays by itself, one chapter every 10 seconds,
 * while the scene changes shape behind it; the dots jump to any chapter (the bar inside the current one shows how much
 * time is left), the round button pauses and resumes, and «Comenzar» goes to the login at any moment.
 *
 * With reduced motion the story does not advance by itself: the visitor moves it with the dots. While it plays, the
 * changes are not announced to screen readers (that would interrupt them every 10 seconds); paused, they are.
 */
export function Welcome({ stage, onStage, onStart }: {
  stage: number;
  onStage: (step: number) => void;
  onStart: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [playing] = useState(() => !prefersStill());
  const stageRef = useRef(stage);
  stageRef.current = stage;
  const chapter = CHAPTERS[index];

  // the scene travels to the shape of the chapter
  useEffect(() => {
    onStage(stepFor(chapter.shape, stageRef.current));
  }, [chapter.shape, onStage]);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setTimeout(() => setIndex(nextChapter), CHAPTER_MS);
    return () => window.clearTimeout(timer);
  }, [playing, index]);

  return (
    <section className="welcome" aria-label="Presentación de WiFiSense">
      <div className="welcome__chapter" key={index} aria-live={playing ? 'off' : 'polite'}>
        <p className="welcome__label">{chapter.label}</p>
        <h1 className="welcome__title">{chapter.title}</h1>
        <p className="welcome__text">{chapter.text}</p>
      </div>

      <div className="welcome__controls">
        <button type="button" className="welcome__start" onClick={onStart}>
          Comenzar <span aria-hidden="true">→</span>
        </button>
      </div>

    </section>
  );
}
