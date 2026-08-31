import { describe, expect, it } from "vitest";
import { SONGS_DATA } from "@/lib/songs-data";
import {
  getMethodologyPayload,
  getWeddingSongsPayload,
  recommendSong,
} from "@/lib/webmcp-client";

describe("WebMCP & Songs Data Integrity", () => {
  it("zawiera dokładnie 13 zweryfikowanych utworów w bazie", () => {
    expect(SONGS_DATA.length).toBe(13);
  });

  it("każdy utwór ma poprawne ID, tytuł PL/EN, artystę oraz ID YouTube", () => {
    for (const song of SONGS_DATA) {
      expect(song.id).toBeTruthy();
      expect(song.title.pl).toBeTruthy();
      expect(song.title.en).toBeTruthy();
      expect(song.artist).toBeTruthy();
      expect(song.youtubeId).toHaveLength(11);
      expect(song.bpm).toBeGreaterThanOrEqual(120);
      expect(song.bpm).toBeLessThanOrEqual(140);
    }
  });

  it("getWeddingSongsPayload zwraca 13 piosenek z pełnymi URL-ami", () => {
    const payload = getWeddingSongsPayload();
    expect(payload.count).toBe(13);
    expect(payload.songs).toHaveLength(13);

    for (const song of payload.songs) {
      expect(song.youtubeUrl).toMatch(
        /^https:\/\/www\.youtube\.com\/watch\?v=/,
      );
      expect(song.trainingUrl).toMatch(
        /^https:\/\/dwanajeden\.netlify\.app\/\?song=/,
      );
    }
  });

  it("recommendSong zwraca właściwy utwór w zależności od poziomu", () => {
    const beginner = recommendSong("beginner");
    expect(beginner.level).toBe("beginner");
    expect(beginner.recommendedSong.bpm).toBeGreaterThanOrEqual(120);
    expect(beginner.recommendedSong.bpm).toBeLessThanOrEqual(124);

    const intermediate = recommendSong("intermediate");
    expect(intermediate.level).toBe("intermediate");
    expect(intermediate.recommendedSong.bpm).toBeGreaterThanOrEqual(125);
    expect(intermediate.recommendedSong.bpm).toBeLessThanOrEqual(130);

    const advanced = recommendSong("advanced");
    expect(advanced.level).toBe("advanced");
    expect(advanced.recommendedSong.bpm).toBeGreaterThanOrEqual(132);
    expect(advanced.recommendedSong.bpm).toBeLessThanOrEqual(138);
  });

  it("getMethodologyPayload zwraca 4 fazy kroku Szuraniec", () => {
    const methodology = getMethodologyPayload();
    expect(methodology.stepName).toBe("Szuraniec");
    expect(methodology.phases).toHaveLength(4);
    expect(methodology.phases.map((p) => p.name)).toEqual([
      "One",
      "Two",
      "Three",
      "And",
    ]);
  });
});
