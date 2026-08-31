import songsJson from "./songs.json";

export interface CanonicalSong {
  id: string;
  title: {
    pl: string;
    en: string;
  };
  artist: string;
  bpm: number;
  youtubeId: string;
}

export const SONGS_DATA: ReadonlyArray<CanonicalSong> =
  songsJson as ReadonlyArray<CanonicalSong>;
