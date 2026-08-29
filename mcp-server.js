#!/usr/bin/env node

const readline = require("readline");

const APP_URL = "https://dwanajeden.netlify.app";
const PROTOCOL_VERSION = "2024-11-05";

const SONGS = [
  {
    id: "chwile",
    title: "Życie To Są Chwile",
    artist: "Akcent",
    bpm: 120,
    youtubeId: "VkvRbfYeXLo",
  },
  {
    id: "dziewczyno",
    title: "Najpiękniejsza Dziewczyno",
    artist: "Boys",
    bpm: 124,
    youtubeId: "qOYuvB_pxIM",
  },
  {
    id: "cudowna",
    title: "Prawdziwa Miłość to Ty",
    artist: "Akcent",
    bpm: 124,
    youtubeId: "k96jS1vurg4",
  },
  {
    id: "zono",
    title: "Żono moja",
    artist: "Masters",
    bpm: 125,
    youtubeId: "J8t9d4TIVHQ",
  },
  {
    id: "miod",
    title: "Miód Malina",
    artist: "MIG",
    bpm: 126,
    youtubeId: "vwCWwZetRaI",
  },
  {
    id: "szalona",
    title: "Jesteś Szalona",
    artist: "Boys",
    bpm: 128,
    youtubeId: "c2i4h7Q-8sA",
  },
  {
    id: "kochana",
    title: "Moja kochana",
    artist: "Boys",
    bpm: 128,
    youtubeId: "YIPQ6pPBX7w",
  },
  {
    id: "mama",
    title: "Mama ostrzegała",
    artist: "Daj to głośniej",
    bpm: 128,
    youtubeId: "D0o6GsYoMak",
  },
  {
    id: "wolnosc",
    title: "Wolność",
    artist: "Boys",
    bpm: 130,
    youtubeId: "jO3DvsPzMww",
  },
  {
    id: "ona_tanczy",
    title: "Ona Tańczy Dla Mnie",
    artist: "Weekend",
    bpm: 130,
    youtubeId: "JvxG3zl_WhU",
  },
  {
    id: "ruda",
    title: "Ruda tańczy jak szalona",
    artist: "Czadoman",
    bpm: 132,
    youtubeId: "tgw1yEcWpTU",
  },
  {
    id: "zielone",
    title: "Przez Twe Oczy Zielone",
    artist: "Akcent",
    bpm: 135,
    youtubeId: "cxtnot8lY4U",
  },
  {
    id: "niewiara",
    title: "Niewiara",
    artist: "Piękni i Młodzi",
    bpm: 138,
    youtubeId: "FnqHOeqK7jQ",
  },
];

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
