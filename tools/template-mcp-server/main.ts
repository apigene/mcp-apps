import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { createServer } from "./server.js";

async function startHttp(createMcpServer: () => McpServer): Promise<void> {
  const port = parseInt(process.env.PORT ?? "3001", 10);
  const app = createMcpExpressApp({ host: "127.0.0.1" });
  app.use(cors());

  // Single server/transport instance keeps UI state between calls in local dev.
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  await server.connect(transport);

  app.all("/mcp", async (req: Request, res: Response) => {
    try {
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  const httpServer = app.listen(port, (err?: Error) => {
    if (err) {
      console.error("Failed to start server:", err);
      process.exit(1);
    }
    console.log(`MCP server: http://127.0.0.1:${port}/mcp`);
    console.log("Tool: show_demo_for");
  });

  const shutdown = () => {
    console.log("\nShutting down...");
    Promise.allSettled([transport.close(), server.close()]).finally(() => {
      httpServer.close(() => process.exit(0));
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function startStdio(createMcpServer: () => McpServer): Promise<void> {
  await createMcpServer().connect(new StdioServerTransport());
}

async function main() {
  if (process.argv.includes("--stdio")) {
    await startStdio(createServer);
  } else {
    await startHttp(createServer);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
