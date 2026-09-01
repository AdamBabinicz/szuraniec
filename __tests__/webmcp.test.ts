import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SONGS_DATA } from "@/lib/songs-data";
import {
  getCurrentTrainerState,
  getMethodologyPayload,
  getWeddingSongsPayload,
  recommendSong,
  registerTrainerBridge,
  registerWebMCPTools,
  serializeSong,
  unregisterTrainerBridge,
  unregisterWebMCPTools,
  type TrainerBridge,
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

describe("WebMCP Trainer Bridge & Action Tools", () => {
  beforeEach(() => {
    unregisterTrainerBridge();
  });

  afterEach(() => {
    unregisterTrainerBridge();
  });

  it("getCurrentTrainerState zwraca bezpieczny stan domyślny, gdy mostek nie jest podpięty", () => {
    const state = getCurrentTrainerState();
    expect(state.training.playing).toBe(false);
    expect(state.training.speed).toBe(1);
    expect(state.song.id).toBe(SONGS_DATA[0].id);
  });

  it("mostek reaguje na zapytania i akcje sterujące treningiem", () => {
    let isPlaying = false;
    let currentSpeed: 0.5 | 1 | 1.25 = 1;
    let currentMode: "baby_steps" | "full_steps" = "full_steps";
    let activeSong = SONGS_DATA[0];

    const mockBridge: TrainerBridge = {
      getState: () => ({
        song: {
          id: activeSong.id,
          title: activeSong.title.pl,
          artist: activeSong.artist,
          bpm: activeSong.bpm,
          effectiveBpm: Math.round(activeSong.bpm * currentSpeed),
        },
        training: {
          playing: isPlaying,
          speed: currentSpeed,
          mode: currentMode,
          step: 1,
          beatName: "One",
          cycle: 1,
          source: "youtube",
          role: "leader",
          muted: false,
          vibrate: false,
        },
        movement: {
          direction: "left",
          weightFoot: "right",
          movingFoot: "left",
          instruction: "Slide left",
        },
      }),
      setSong: (songId: string) => {
        const found = SONGS_DATA.find((s) => s.id === songId);
        if (!found) return { success: false, message: "Not found" };
        activeSong = found;
        return {
          success: true,
          message: `Changed to ${found.artist}`,
          song: serializeSong({
            id: found.id,
            title: found.title.pl,
            artist: found.artist,
            bpm: found.bpm,
            youtubeId: found.youtubeId,
          }),
        };
      },
      setTempo: (speed) => {
        currentSpeed = speed;
        return {
          success: true,
          speed,
          effectiveBpm: Math.round(activeSong.bpm * speed),
        };
      },
      setPracticeMode: (mode) => {
        currentMode = mode;
        return { success: true, mode };
      },
      start: () => {
        isPlaying = true;
        return { success: true, status: "playing" };
      },
      pause: () => {
        isPlaying = false;
        return { success: true, status: "paused" };
      },
      reset: () => {
        isPlaying = false;
        return { success: true, status: "reset" };
      },
    };

    registerTrainerBridge(mockBridge);

    // Test odczytu początkowego
    expect(getCurrentTrainerState().training.playing).toBe(false);

    // Test start_practice
    expect(mockBridge.start()).toEqual({ success: true, status: "playing" });
    expect(getCurrentTrainerState().training.playing).toBe(true);

    // Test set_tempo
    expect(mockBridge.setTempo(0.5)).toEqual({
      success: true,
      speed: 0.5,
      effectiveBpm: 60,
    });
    expect(getCurrentTrainerState().song.effectiveBpm).toBe(60);

    // Test set_song
    const newSong = SONGS_DATA[5]; // Boys - Jesteś Szalona (128 BPM)
    mockBridge.setSong(newSong.id);
    expect(getCurrentTrainerState().song.id).toBe(newSong.id);

    // Test set_practice_mode
    mockBridge.setPracticeMode("baby_steps");
    expect(getCurrentTrainerState().training.mode).toBe("baby_steps");

    // Test pause_practice
    expect(mockBridge.pause()).toEqual({ success: true, status: "paused" });
    expect(getCurrentTrainerState().training.playing).toBe(false);
  });
});

describe("Native WebMCP Registration", () => {
  beforeEach(() => {
    unregisterWebMCPTools();
  });

  afterEach(() => {
    unregisterWebMCPTools();
  });

  it("rejestruje wszystkie 10 narzędzi w document.modelContext", async () => {
    const registeredTools: Array<{ name: string; execute: Function }> = [];

    const mockModelContext = {
      registerTool: vi.fn().mockImplementation((descriptor) => {
        registeredTools.push(descriptor);
        return Promise.resolve();
      }),
    };

    (globalThis as any).document = {
      modelContext: mockModelContext,
    };

    const registered = await registerWebMCPTools();
    expect(registered).toBe(true);
    expect(registeredTools).toHaveLength(10);

    const toolNames = registeredTools.map((t) => t.name);
    expect(toolNames).toEqual([
      "get_wedding_songs",
      "get_step_instructions",
      "recommend_song_by_bpm",
      "get_training_state",
      "set_song",
      "set_tempo",
      "set_practice_mode",
      "start_practice",
      "pause_practice",
      "reset_practice",
    ]);

    // Test wykonania toola get_wedding_songs
    const songsTool = registeredTools.find(
      (t) => t.name === "get_wedding_songs",
    );
    const result = await songsTool?.execute({});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.count).toBe(13);
  });
});
