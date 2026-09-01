#!/usr/bin/env node

const readline = require("readline");
const path = require("path");

const APP_URL = "https://dwanajeden.netlify.app";
const PROTOCOL_VERSION = "2024-11-05";

// Pobieranie danych z kanonicznego pliku lib/songs.json
const rawSongs = require(path.join(__dirname, "lib", "songs.json"));

const SONGS = rawSongs.map((s) => ({
  id: s.id,
  title: s.title.pl,
  artist: s.artist,
  bpm: s.bpm,
  youtubeId: s.youtubeId,
}));

const INSTRUCTIONS = {
  stepName: "Szuraniec",
  alternativeName: "Disco Fox 2-on-1",
  methodology:
    "PrimaDance-inspired wedding dance method: bent knees, no jumping, smooth sole-to-floor movement, controlled weight transfer, and optional Baby Steps for beginners.",
  phases: [
    {
      step: 1,
      name: "One",
      duration: "1 beat",
      action:
        "The left foot slides to the left while body weight remains on the right foot.",
    },
    {
      step: 2,
      name: "Two",
      duration: "1 beat",
      action:
        "The right foot closes toward the left foot and the body weight transfers to the moving foot.",
    },
    {
      step: 3,
      name: "Three",
      duration: "0.5 beat",
      action: "A quick half-beat sliding movement with the leading foot.",
    },
    {
      step: 4,
      name: "And",
      duration: "0.5 beat",
      action:
        "The other foot closes on the syncopation without creating a heavy step. The next bar mirrors the direction.",
    },
  ],
  timing:
    "The complete pattern lasts 3 beats: 1 + 1 + 0.5 + 0.5. The direction alternates every bar.",
  babySteps:
    "Baby Steps mode reduces movement size so beginners can focus on rhythm and weight transfer before increasing amplitude.",
};

const LEVEL_RANGES = {
  beginner: {
    min: 120,
    max: 124,
    explanation:
      "A slower tempo is recommended for learning the basic movement and weight transfer.",
  },
  intermediate: {
    min: 125,
    max: 130,
    explanation:
      "A medium tempo is suitable for dancers who already know the basic pattern.",
  },
  advanced: {
    min: 132,
    max: 138,
    explanation:
      "A faster tempo provides a more energetic wedding-dance challenge.",
  },
};

const RESOURCE_URIS = {
  methodology: "dance://methodology/szuraniec",
  songs: "dance://songs/wedding-hits",
};

// Stan sesji w trybie serwera standalone
let sessionState = {
  songId: SONGS[0].id,
  speed: 1,
  playing: false,
  mode: "full_steps",
  step: 1,
  cycle: 1,
  role: "leader",
  source: "youtube",
  muted: false,
  vibrate: false,
};

function getSongUrl(song) {
  return `${APP_URL}/?song=${encodeURIComponent(song.id)}`;
}

function serializeSong(song) {
  return {
    ...song,
    youtubeUrl: `https://www.youtube.com/watch?v=${song.youtubeId}`,
    trainingUrl: getSongUrl(song),
  };
}

function getWeddingSongsPayload() {
  return {
    count: SONGS.length,
    description:
      "13 Polish wedding songs selected for practicing the Szuraniec / Disco Fox 2-on-1 step.",
    songs: SONGS.map(serializeSong),
  };
}

function getMethodologyPayload() {
  return {
    ...INSTRUCTIONS,
    appUrl: APP_URL,
  };
}

function recommendSong(level) {
  const normalizedLevel = LEVEL_RANGES[level] ? level : "beginner";
  const selectedRange = LEVEL_RANGES[normalizedLevel];

  const candidates = SONGS.filter(
    (song) => song.bpm >= selectedRange.min && song.bpm <= selectedRange.max,
  );

  const song =
    normalizedLevel === "beginner"
      ? candidates[0]
      : normalizedLevel === "intermediate"
        ? candidates[Math.floor(candidates.length / 2)]
        : candidates[candidates.length - 1];

  return {
    level: normalizedLevel,
    recommendedSong: serializeSong(song),
    bpmRange: {
      min: selectedRange.min,
      max: selectedRange.max,
    },
    reason: selectedRange.explanation,
  };
}

function getTrainingStatePayload() {
  const currentSong =
    SONGS.find((s) => s.id === sessionState.songId) || SONGS[0];
  const effectiveBpm = Math.round(currentSong.bpm * sessionState.speed);
  const phase =
    INSTRUCTIONS.phases[sessionState.step - 1] || INSTRUCTIONS.phases[0];

  return {
    song: {
      id: currentSong.id,
      title: currentSong.title,
      artist: currentSong.artist,
      bpm: currentSong.bpm,
      effectiveBpm,
    },
    training: {
      playing: sessionState.playing,
      speed: sessionState.speed,
      mode: sessionState.mode,
      step: sessionState.step,
      beatName: phase.name,
      cycle: sessionState.cycle,
      source: sessionState.source,
      role: sessionState.role,
      muted: sessionState.muted,
      vibrate: sessionState.vibrate,
    },
    movement: {
      direction: sessionState.cycle % 2 === 1 ? "left" : "right",
      weightFoot:
        sessionState.step === 1 || sessionState.step === 3 ? "right" : "left",
      movingFoot:
        sessionState.step === 1 || sessionState.step === 3 ? "left" : "right",
      instruction: phase.action,
    },
  };
}

function jsonRpcResult(id, result) {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

function jsonRpcError(id, code, message) {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  };
}

function stringifyTextContent(payload) {
  return JSON.stringify(payload, null, 2);
}

function listTools() {
  return [
    {
      name: "get_wedding_songs",
      description:
        "Returns the complete library of 13 verified Polish wedding songs, including artist, BPM, YouTube ID, YouTube URL, and a direct training URL.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "get_step_instructions",
      description:
        "Returns the complete English instructions and timing for the four phases of the Szuraniec / Disco Fox 2-on-1 wedding dance step.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "recommend_song_by_bpm",
      description:
        "Recommends a wedding song from the 13-song training library based on the dancer's level: beginner, intermediate, or advanced.",
      inputSchema: {
        type: "object",
        properties: {
          level: {
            type: "string",
            enum: ["beginner", "intermediate", "advanced"],
            description: "The dancer's experience level.",
          },
        },
        required: ["level"],
      },
    },
    {
      name: "get_training_state",
      description:
        "Returns real-time dance trainer state: active song, tempo/BPM, playback state, current step phase (One/Two/Three/And), cycle bar, direction, moving foot, and weight foot.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "set_song",
      description:
        "Changes the active wedding song in the dance trainer by song ID.",
      inputSchema: {
        type: "object",
        properties: {
          songId: {
            type: "string",
            description:
              "The ID of the song to select (e.g., 'szalona', 'zycie', 'niewiara', 'miod_malina').",
          },
        },
        required: ["songId"],
      },
    },
    {
      name: "set_tempo",
      description:
        "Sets the practice speed multiplier for the trainer (0.5 for half speed, 1 for normal speed, 1.25 for fast speed).",
      inputSchema: {
        type: "object",
        properties: {
          speed: {
            type: "number",
            enum: [0.5, 1, 1.25],
            description: "Playback speed multiplier: 0.5, 1, or 1.25.",
          },
        },
        required: ["speed"],
      },
    },
    {
      name: "set_practice_mode",
      description:
        "Configures the footwork practice mode: 'baby_steps' (smaller movements for beginners) or 'full_steps' (standard dance steps).",
      inputSchema: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: ["baby_steps", "full_steps"],
            description: "Practice mode: 'baby_steps' or 'full_steps'.",
          },
        },
        required: ["mode"],
      },
    },
    {
      name: "start_practice",
      description:
        "Starts or resumes the dance practice session, metronome, and video playback.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "pause_practice",
      description:
        "Pauses the current dance practice session, stopping audio and step progression.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "reset_practice",
      description:
        "Resets the dance practice session to the beginning (phase 1, bar 1, video seek to 0).",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
  ];
}

function listResources() {
  return [
    {
      uri: RESOURCE_URIS.methodology,
      name: "Szuraniec dance methodology",
      description:
        "Machine-readable methodology, timing, and four movement phases for the Szuraniec / Disco Fox 2-on-1 wedding dance step.",
      mimeType: "application/json",
    },
    {
      uri: RESOURCE_URIS.songs,
      name: "Polish wedding hits library",
      description:
        "Machine-readable library of 13 verified Polish wedding songs with BPM, YouTube URLs, and direct training URLs.",
      mimeType: "application/json",
    },
  ];
}

function readResource(uri) {
  if (uri === RESOURCE_URIS.methodology) {
    return {
      uri,
      mimeType: "application/json",
      text: stringifyTextContent(getMethodologyPayload()),
    };
  }

  if (uri === RESOURCE_URIS.songs) {
    return {
      uri,
      mimeType: "application/json",
      text: stringifyTextContent(getWeddingSongsPayload()),
    };
  }

  return null;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", (line) => {
  if (!line.trim()) return;

  try {
    const req = JSON.parse(line);
    const res = handleRpc(req);

    if (res) {
      process.stdout.write(JSON.stringify(res) + "\n");
    }
  } catch (error) {
    process.stdout.write(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32700,
          message: "Invalid JSON-RPC request.",
        },
      }) + "\n",
    );
  }
});

function handleRpc(req) {
  const { id, method, params } = req || {};

  if (!method) {
    return jsonRpcError(id ?? null, -32600, "Missing method.");
  }

  if (method === "notifications/initialized") {
    return null;
  }

  if (method === "ping") {
    return jsonRpcResult(id, {});
  }

  if (method === "initialize") {
    return jsonRpcResult(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {
        tools: {},
        resources: {},
      },
      serverInfo: {
        name: "dwa-na-jeden-trainer",
        version: "2.0.0",
      },
    });
  }

  if (method === "tools/list") {
    return jsonRpcResult(id, {
      tools: listTools(),
    });
  }

  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments || {};

    if (name === "get_wedding_songs") {
      return jsonRpcResult(id, {
        content: [
          {
            type: "text",
            text: stringifyTextContent(getWeddingSongsPayload()),
          },
        ],
      });
    }

    if (name === "get_step_instructions") {
      return jsonRpcResult(id, {
        content: [
          {
            type: "text",
            text: stringifyTextContent(getMethodologyPayload()),
          },
        ],
      });
    }

    if (name === "recommend_song_by_bpm") {
      const recommendation = recommendSong(args.level);
      return jsonRpcResult(id, {
        content: [
          {
            type: "text",
            text: stringifyTextContent(recommendation),
          },
        ],
      });
    }

    if (name === "get_training_state") {
      return jsonRpcResult(id, {
        content: [
          {
            type: "text",
            text: stringifyTextContent(getTrainingStatePayload()),
          },
        ],
      });
    }

    if (name === "set_song") {
      const found = SONGS.find((s) => s.id === args.songId);
      if (!found) {
        return jsonRpcResult(id, {
          content: [
            {
              type: "text",
              text: stringifyTextContent({
                success: false,
                error: `Song '${args.songId}' not found. Available: ${SONGS.map((s) => s.id).join(", ")}`,
              }),
            },
          ],
        });
      }
      sessionState.songId = found.id;
      return jsonRpcResult(id, {
        content: [
          {
            type: "text",
            text: stringifyTextContent({
              success: true,
              message: `Song changed to ${found.artist} - ${found.title}`,
              song: serializeSong(found),
            }),
          },
        ],
      });
    }

    if (name === "set_tempo") {
      const speed = Number(args.speed);
      if (![0.5, 1, 1.25].includes(speed)) {
        return jsonRpcResult(id, {
          content: [
            {
              type: "text",
              text: stringifyTextContent({
                success: false,
                error: "Invalid speed. Allowed values: 0.5, 1, 1.25.",
              }),
            },
          ],
        });
      }
      sessionState.speed = speed;
      const currentSong =
        SONGS.find((s) => s.id === sessionState.songId) || SONGS[0];
      return jsonRpcResult(id, {
        content: [
          {
            type: "text",
            text: stringifyTextContent({
              success: true,
              speed,
              effectiveBpm: Math.round(currentSong.bpm * speed),
            }),
          },
        ],
      });
    }

    if (name === "set_practice_mode") {
      const mode = args.mode;
      if (!["baby_steps", "full_steps"].includes(mode)) {
        return jsonRpcResult(id, {
          content: [
            {
              type: "text",
              text: stringifyTextContent({
                success: false,
                error: "Invalid mode. Allowed: 'baby_steps' or 'full_steps'.",
              }),
            },
          ],
        });
      }
      sessionState.mode = mode;
      return jsonRpcResult(id, {
        content: [
          {
            type: "text",
            text: stringifyTextContent({
              success: true,
              mode,
            }),
          },
        ],
      });
    }

    if (name === "start_practice") {
      sessionState.playing = true;
      return jsonRpcResult(id, {
        content: [
          {
            type: "text",
            text: stringifyTextContent({
              success: true,
              status: "playing",
            }),
          },
        ],
      });
    }

    if (name === "pause_practice") {
      sessionState.playing = false;
      return jsonRpcResult(id, {
        content: [
          {
            type: "text",
            text: stringifyTextContent({
              success: true,
              status: "paused",
            }),
          },
        ],
      });
    }

    if (name === "reset_practice") {
      sessionState.playing = false;
      sessionState.step = 1;
      sessionState.cycle = 1;
      return jsonRpcResult(id, {
        content: [
          {
            type: "text",
            text: stringifyTextContent({
              success: true,
              status: "reset",
            }),
          },
        ],
      });
    }

    return jsonRpcError(id, -32601, `Unknown tool: ${name}`);
  }

  if (method === "resources/list") {
    return jsonRpcResult(id, {
      resources: listResources(),
    });
  }

  if (method === "resources/read") {
    const uri = params?.uri;
    const resource = readResource(uri);

    if (!resource) {
      return jsonRpcError(id, -32602, `Unknown resource URI: ${uri}`);
    }

    return jsonRpcResult(id, {
      contents: [resource],
    });
  }

  return jsonRpcError(id, -32601, `Unknown method: ${method}`);
}
