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

  const tty = process.stdout?.isTTY;
  const dim = (s: string) => (tty ? `\x1b[2m${s}\x1b[0m` : s);
  const cyan = (s: string) => (tty ? `\x1b[36m${s}\x1b[0m` : s);

  const httpServer = app.listen(port, (err?: Error) => {
    if (err) {
      console.error("Failed to start server:", err);
      process.exit(1);
    }
    console.log(cyan(`MCP server: http://127.0.0.1:${port}/mcp`));
    console.log(dim("Tools:"));
    console.log(dim(`  • list_demo_apps — list all demo apps (no args)`));
    console.log(dim(`  • show_demo_app  — open a demo (args: template name or request like "show demo app xyz-users")`));
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
