import { Composition } from 'remotion';
import { Trailer, TRAILER_DURATION, TRAILER_FPS } from './Trailer';

export const Root: React.FC = () => (
  <Composition
    id="Trailer"
    component={Trailer}
    durationInFrames={TRAILER_DURATION}
    fps={TRAILER_FPS}
    width={1080}
    height={1920}
  />
);
