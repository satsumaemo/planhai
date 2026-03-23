export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Planhai API",
    version: "1.0.0",
    description:
      "Public REST API for Planhai — a creative platform for sharing and discovering creations.",
  },
  servers: [{ url: "/api/v1" }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http" as const,
        scheme: "bearer",
        description: "API key from /settings page. Pass as: Authorization: Bearer nh_xxx...",
      },
    },
    schemas: {
      Error: {
        type: "object" as const,
        properties: {
          error: {
            type: "object" as const,
            properties: {
              code: { type: "integer" as const },
              message: { type: "string" as const },
            },
          },
        },
      },
      Creation: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          title: { type: "string" as const },
          description: { type: "string" as const, nullable: true },
          category: { type: "string" as const },
          sub_category: { type: "string" as const, nullable: true },
          thumbnail_url: { type: "string" as const, nullable: true },
          like_count: { type: "integer" as const },
          view_count: { type: "integer" as const },
          created_at: { type: "string" as const, format: "date-time" },
        },
      },
    },
  },
  paths: {
    "/creations": {
      post: {
        summary: "Create a new creation",
        tags: ["Creations"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object" as const,
                required: ["title", "category"],
                properties: {
                  title: { type: "string" as const, example: "My App" },
                  description: { type: "string" as const },
                  category: { type: "string" as const, example: "development" },
                  sub_category: { type: "string" as const, example: "webApp" },
                  file_url: { type: "string" as const },
                  thumbnail_url: { type: "string" as const },
                  tools: { type: "array" as const, items: { type: "string" as const } },
                  tags: { type: "array" as const, items: { type: "string" as const }, maxItems: 5 },
                  visibility: { type: "string" as const, enum: ["public", "unlisted", "private"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Created successfully" },
          "400": { description: "Validation error" },
          "401": { description: "Invalid API key" },
          "429": { description: "Rate limit exceeded" },
        },
      },
    },
    "/creations/{id}": {
      get: {
        summary: "Get creation details",
        tags: ["Creations"],
        parameters: [{ name: "id", in: "path" as const, required: true, schema: { type: "string" as const } }],
        responses: {
          "200": { description: "Creation details" },
          "404": { description: "Not found" },
        },
      },
    },
    "/creations/{id}/fork": {
      post: {
        summary: "Fork a creation",
        tags: ["Creations"],
        parameters: [{ name: "id", in: "path" as const, required: true, schema: { type: "string" as const } }],
        responses: {
          "200": { description: "Fork created" },
          "404": { description: "Original not found" },
        },
      },
    },
    "/creations/{id}/like": {
      post: {
        summary: "Toggle like on a creation",
        tags: ["Creations"],
        parameters: [{ name: "id", in: "path" as const, required: true, schema: { type: "string" as const } }],
        responses: {
          "200": { description: "{ liked: true } or { liked: false }" },
          "404": { description: "Not found" },
        },
      },
    },
    "/search": {
      get: {
        summary: "Search creations",
        tags: ["Search"],
        parameters: [
          { name: "q", in: "query" as const, required: true, schema: { type: "string" as const }, description: "Search query" },
          { name: "category", in: "query" as const, schema: { type: "string" as const }, description: "Filter by category" },
          { name: "cursor", in: "query" as const, schema: { type: "string" as const }, description: "Pagination cursor" },
          { name: "limit", in: "query" as const, schema: { type: "integer" as const, default: 20, maximum: 50 } },
        ],
        responses: {
          "200": { description: "Search results with next_cursor" },
          "400": { description: "Missing q parameter" },
        },
      },
    },
    "/users/{id}/creations": {
      get: {
        summary: "List user's creations",
        tags: ["Users"],
        parameters: [
          { name: "id", in: "path" as const, required: true, schema: { type: "string" as const } },
          { name: "cursor", in: "query" as const, schema: { type: "string" as const } },
          { name: "limit", in: "query" as const, schema: { type: "integer" as const, default: 20, maximum: 50 } },
        ],
        responses: { "200": { description: "List of creations" } },
      },
    },
    "/trending": {
      get: {
        summary: "Get trending creations",
        tags: ["Discovery"],
        parameters: [
          { name: "category", in: "query" as const, schema: { type: "string" as const } },
          { name: "cursor", in: "query" as const, schema: { type: "string" as const } },
          { name: "limit", in: "query" as const, schema: { type: "integer" as const, default: 20, maximum: 50 } },
        ],
        responses: { "200": { description: "Trending creations sorted by view_count" } },
      },
    },
  },
};
