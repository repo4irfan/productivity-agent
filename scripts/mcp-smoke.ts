import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "src/mcp/index.ts"],
});

const client = new Client({ name: "smoke-test", version: "1.0.0" });

await client.connect(transport);

const { tools } = await client.listTools();

console.log(`\n${tools.length} tools:\n`);

for (const tool of tools) {
  const hints = [
    tool.annotations?.readOnlyHint ? "read-only" : null,
    tool.annotations?.destructiveHint ? "destructive" : null,
  ].filter(Boolean);

  console.log(`  ${tool.name.padEnd(22)} ${hints.join(", ") || "-"}`);
}

const listed = await client.callTool({ name: "list_tasks", arguments: {} });
const text = (listed.content as Array<{ text?: string }>)[0]?.text ?? "";

console.log(`\nlist_tasks → ${JSON.parse(text).data?.length ?? 0} tasks`);

await client.close();
process.exit(0);