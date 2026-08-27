#!/usr/bin/env node
const readline = require("readline");

const SONGS = [
  {
    id: "szalona",
    title: "Boys — Jesteś Szalona",
    bpm: 128,
    ytId: "c2i4h7Q-8sA",
  },
  {
    id: "przez_twe_oczy",
    title: "Akcent — Przez Twe Oczy Zielone",
    bpm: 136,
    ytId: "cXT_Mmp_nZE",
  },
  {
    id: "ona_tanczy",
    title: "Weekend — Ona Tańczy Dla Mnie",
    bpm: 130,
    ytId: "JvxG39IA_ms",
  },
  {
    id: "zycie_to_chwile",
    title: "Akcent — Życie to są chwile",
    bpm: 124,
    ytId: "k2X4iFfM5xM",
  },
  {
    id: "niewiara",
    title: "Piękni i Młodzi — Niewiara",
    bpm: 132,
    ytId: "14_BskrTz_4",
  },
  {
    id: "ruda_tanczy",
    title: "Czadoman — Ruda Tańczy Jak Szalona",
    bpm: 138,
    ytId: "x0b0Qd-tq7c",
  },
];

const INSTRUCTIONS = {
  phases: [
    {
      step: 1,
      name: "Raz",
      duration: "1.0 bit",
      action: "Lewa stopa szura w lewo. Ciężar ciała zostaje na prawej nodze.",
    },
    {
      step: 2,
      name: "Dwa",
      duration: "1.0 bit",
      action: "Prawa stopa dosuwa się. Ciężar przechodzi na stopę wykroczną.",
    },
    {
      step: 3,
      name: "Trzy",
      duration: "0.5 bita (szybko)",
      action: "Szybkie szurnięcie stopą wykroczną – pół miary.",
    },
    {
      step: 4,
      name: "I",
      duration: "0.5 bita (synkopa)",
      action: "Dosuw na synkopie. Następny takt idzie w drugą stronę.",
    },
  ],
  methodology:
    "PrimaDance: ugięte kolana, brak podskoków, sunięcie podeszwą po parkiecie, Baby Steps.",
};

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
    if (res) process.stdout.write(JSON.stringify(res) + "\n");
  } catch (e) {}
});

function handleRpc(req) {
  const { id, method, params } = req;
  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "dwa-na-jeden-trainer", version: "1.0.0" },
      },
    };
  }

  if (method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        tools: [
          {
            name: "get_wedding_songs",
            description:
              "Zwraca bazę zweryfikowanych polskich hitów weselnych z przypisanym tempem BPM i YouTube ID.",
            inputSchema: { type: "object", properties: {} },
          },
          {
            name: "get_step_instructions",
            description:
              "Zwraca pełną metodykę i timing 4 faz kroku Szurańca (1, 2, 3 i).",
            inputSchema: { type: "object", properties: {} },
          },
          {
            name: "recommend_song_by_bpm",
            description:
              "Rekomenduje utwór weselny dopasowany do poziomu tancerza (beginner / intermediate / advanced).",
            inputSchema: {
              type: "object",
              properties: {
                level: {
                  type: "string",
                  enum: ["beginner", "intermediate", "advanced"],
                  description: "Poziom tancerza",
                },
              },
              required: ["level"],
            },
          },
        ],
      },
    };
  }

  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments || {};

    if (name === "get_wedding_songs") {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(SONGS, null, 2) }],
        },
      };
    }
    if (name === "get_step_instructions") {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            { type: "text", text: JSON.stringify(INSTRUCTIONS, null, 2) },
          ],
        },
      };
    }
    if (name === "recommend_song_by_bpm") {
      let filtered = SONGS[0];
      if (args.level === "beginner") filtered = SONGS.find((s) => s.bpm <= 128);
      else if (args.level === "advanced")
        filtered = SONGS.find((s) => s.bpm >= 136);
      else filtered = SONGS.find((s) => s.bpm === 130 || s.bpm === 132);

      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: `Rekomendacja dla poziomu [${args.level || "beginner"}]: ${filtered.title} (${filtered.bpm} BPM). Otwórz w aplikacji: https://dwanajeden.netlify.app/?song=${filtered.id}`,
            },
          ],
        },
      };
    }
  }

  return { jsonrpc: "2.0", id, result: {} };
}
