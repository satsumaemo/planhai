export interface SubCategory {
  key: string;
}

export interface Category {
  key: string;
  icon: string;
  subCategories: SubCategory[];
  tools: string[];
}

export const CATEGORIES: Category[] = [
  {
    key: "development",
    icon: "code",
    subCategories: [
      { key: "webApp" },
      { key: "mobileApp" },
      { key: "apiBackend" },
      { key: "codeSnippet" },
      { key: "botAgent" },
      { key: "browserExtension" },
      { key: "cliTool" },
      { key: "other" },
    ],
    tools: [
      "React",
      "Next.js",
      "Flutter",
      "Swift",
      "Python",
      "Node.js",
      "Vercel",
      "Replit",
      "Cursor",
      "Bolt",
      "Lovable",
    ],
  },
  {
    key: "design",
    icon: "palette",
    subCategories: [
      { key: "graphicDesign" },
      { key: "uiUxDesign" },
      { key: "illustration" },
      { key: "logoBranding" },
      { key: "productDesign" },
      { key: "architectureInterior" },
      { key: "fashionDesign" },
      { key: "posterBanner" },
      { key: "other" },
    ],
    tools: [
      "Figma",
      "Adobe Photoshop",
      "Adobe Illustrator",
      "Canva",
      "Midjourney",
      "DALL-E",
      "Stable Diffusion",
    ],
  },
  {
    key: "3dArVr",
    icon: "cube",
    subCategories: [
      { key: "3dModeling" },
      { key: "3dAnimation" },
      { key: "arExperience" },
      { key: "vrExperience" },
      { key: "gameAsset" },
      { key: "architecturalViz" },
      { key: "productRendering" },
      { key: "other" },
    ],
    tools: [
      "Blender",
      "Maya",
      "Cinema 4D",
      "ZBrush",
      "Unreal Engine",
      "Unity",
      "Three.js",
      "Spline",
    ],
  },
  {
    key: "media",
    icon: "film",
    subCategories: [
      { key: "videoShort" },
      { key: "videoLong" },
      { key: "motionGraphics" },
      { key: "animation" },
      { key: "music" },
      { key: "soundDesign" },
      { key: "podcastVoice" },
      { key: "aiVoiceTts" },
      { key: "other" },
    ],
    tools: [
      "Premiere Pro",
      "After Effects",
      "DaVinci Resolve",
      "CapCut",
      "Runway",
      "Pika",
      "Sora",
      "Suno",
      "ElevenLabs",
    ],
  },
  {
    key: "documentBusiness",
    icon: "fileText",
    subCategories: [
      { key: "reportWhitePaper" },
      { key: "pitchDeck" },
      { key: "businessPlan" },
      { key: "resumeCv" },
      { key: "proposal" },
      { key: "newsletter" },
      { key: "blogPost" },
      { key: "caseStudy" },
      { key: "researchPaper" },
      { key: "other" },
    ],
    tools: [
      "Google Docs",
      "Notion",
      "Microsoft Word",
      "Google Slides",
      "PowerPoint",
      "Gamma",
      "Tome",
    ],
  },
  {
    key: "templatePrompt",
    icon: "zap",
    subCategories: [
      { key: "aiPrompt" },
      { key: "workflowAutomation" },
      { key: "designTemplate" },
      { key: "codeTemplate" },
      { key: "spreadsheetTemplate" },
      { key: "notionDocsTemplate" },
      { key: "emailTemplate" },
      { key: "other" },
    ],
    tools: [
      "ChatGPT",
      "Claude",
      "Gemini",
      "Midjourney",
      "ComfyUI",
      "LangChain",
      "Make",
      "Zapier",
      "n8n",
    ],
  },
  {
    key: "interactive",
    icon: "gamepad",
    subCategories: [
      { key: "game" },
      { key: "simulation" },
      { key: "dataVisualization" },
      { key: "calculatorConverter" },
      { key: "quizSurvey" },
      { key: "dashboard" },
      { key: "mapGeo" },
      { key: "other" },
    ],
    tools: [
      "p5.js",
      "D3.js",
      "Three.js",
      "Phaser",
      "Godot",
      "Unity WebGL",
      "Streamlit",
      "Gradio",
    ],
  },
  {
    key: "other",
    icon: "box",
    subCategories: [
      { key: "experimental" },
      { key: "hardwareIot" },
      { key: "dataset" },
      { key: "tutorialGuide" },
      { key: "collectionCuration" },
      { key: "other" },
    ],
    tools: ["Custom/Other"],
  },
];

// Valid category keys for AI result validation
export const VALID_CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

export const VALID_SUB_CATEGORY_KEYS: Record<string, string[]> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.subCategories.map((s) => s.key)])
);
