var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "10mb" }));
var aiClient = null;
function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  if (!aiClient) {
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
app.post("/api/analyze", async (req, res) => {
  const { text, currentDate } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Text input is required" });
  }
  const dateStr = currentDate || "2026-09-05";
  const client = getAiClient();
  if (!client) {
    console.log("Using mock rule-based analyzer (No GEMINI_API_KEY provided)");
    const lower = text.toLowerCase();
    let category = "note";
    if (lower.includes("spotkan") || lower.includes("rozmow")) category = "meeting";
    if (lower.includes("telefon") || lower.includes("kontakt") || lower.includes("zadzwon")) category = "contact";
    if (lower.includes("problem") || lower.includes("awari") || lower.includes("uszkodz")) category = "issue";
    if (lower.includes("ustalil") || lower.includes("decyzj")) category = "decision";
    if (lower.includes("prac") || lower.includes("serwis") || lower.includes("zamont")) category = "work";
    if (lower.includes("zdjec") || lower.includes("foto")) category = "photo";
    if (lower.includes("dokument") || lower.includes("pdf")) category = "document";
    let priority = "normal";
    if (lower.includes("piln") || lower.includes("awari") || lower.includes("po\u017Car") || lower.includes("asap")) {
      priority = "urgent";
    } else if (lower.includes("wa\u017Cn") || lower.includes("szybk")) {
      priority = "high";
    }
    const title = text.slice(0, 45) + (text.length > 45 ? "..." : "");
    const people = [];
    if (lower.includes("kierownik")) people.push("Kierownik Parkingu");
    if (lower.includes("wykonawc")) people.push("Wykonawca");
    if (lower.includes("serwis")) people.push("Serwis");
    if (lower.includes("dyrektor")) people.push("Dyrektor");
    const tasks = [];
    if (lower.includes("wycen") || lower.includes("przygotowac") || lower.includes("zrobic")) {
      tasks.push({
        title: "Przygotowa\u0107 wycen\u0119 / realizacj\u0119",
        description: text,
        dueDate: "2026-09-11",
        // next Friday
        assignedTo: lower.includes("wykonawc") ? "Wykonawca" : "Osoba odpowiedzialna",
        priority
      });
    }
    let problem = null;
    if (category === "issue" || lower.includes("problem") || lower.includes("uszkodz")) {
      problem = {
        title: "Zg\u0142oszona usterka: " + text.slice(0, 30) + "...",
        description: text,
        priority
      };
    }
    return res.json({
      success: true,
      mocked: true,
      data: {
        category,
        priority,
        title,
        people,
        tasks,
        problem
      }
    });
  }
  try {
    const prompt = `Analyze this journal entry from a parking project manager and extract key structured information in Polish:
"${text}"

Current date is ${dateStr} (assume year is 2026).
Calculate deadlines relatively:
- "do pi\u0105tku" is the nearest Friday after ${dateStr}.
- "do ko\u0144ca miesi\u0105ca" is the last day of the current month of ${dateStr}.
- "na jutro" is the next day after ${dateStr}.

Extract recommended category, priority, brief title, people, tasks, and problem details strictly matching the schema.`;
    const response = await client.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            category: {
              type: import_genai.Type.STRING,
              description: "Recommended category: 'note' | 'meeting' | 'contact' | 'issue' | 'work' | 'done' | 'decision' | 'document' | 'photo' | 'info'"
            },
            priority: {
              type: import_genai.Type.STRING,
              description: "Recommended priority: 'low' | 'normal' | 'high' | 'urgent'"
            },
            title: {
              type: import_genai.Type.STRING,
              description: "Brief summary/title of the entry in Polish (max 50 characters)"
            },
            people: {
              type: import_genai.Type.ARRAY,
              items: { type: import_genai.Type.STRING },
              description: "List of people or roles mentioned in the text (e.g. 'Kierownik Parkingu', 'Wykonawca')"
            },
            tasks: {
              type: import_genai.Type.ARRAY,
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  title: { type: import_genai.Type.STRING, description: "Task title in Polish" },
                  description: { type: import_genai.Type.STRING, description: "Detailed task description in Polish" },
                  dueDate: { type: import_genai.Type.STRING, description: "YYYY-MM-DD format, computed relative to current date" },
                  assignedTo: { type: import_genai.Type.STRING, description: "Person or role responsible (e.g., 'Wykonawca', 'Serwisant', or 'U\u017Cytkownik')" },
                  priority: { type: import_genai.Type.STRING, description: "'low' | 'normal' | 'high' | 'urgent'" }
                },
                required: ["title", "description", "dueDate", "assignedTo", "priority"]
              },
              description: "Tasks that should be created based on the text"
            },
            problem: {
              type: import_genai.Type.OBJECT,
              properties: {
                title: { type: import_genai.Type.STRING, description: "Problem/Issue title in Polish" },
                description: { type: import_genai.Type.STRING, description: "Problem/Issue description in Polish" },
                priority: { type: import_genai.Type.STRING, description: "'low' | 'normal' | 'high' | 'urgent'" }
              },
              description: "Problem details if a problem was mentioned, otherwise empty/null properties."
            }
          },
          required: ["category", "priority", "title", "people", "tasks"]
        }
      }
    });
    const parsedData = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      data: parsedData
    });
  } catch (error) {
    console.error("Gemini API analysis failed:", error);
    return res.status(500).json({ error: "Failed to analyze text using AI", details: error.message });
  }
});
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Running in Development mode with Vite middleware");
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in Production mode");
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
setupServer();
//# sourceMappingURL=server.cjs.map
