<!-- Shared by API chat and Joe's CLI/MCP connection. Loading changes context, never permissions. -->

## description

Load the full instructions and argument schema for a FlowJoe tool before using it. Every permitted tool's name and purpose remains visible; none has been hidden based on a guess about your task. Call describe_joe_tool with the exact tool name, follow the returned full description, then call that named tool with arguments_json containing a JSON object matching the returned parameters. Reuse a schema already loaded in this conversation when still applicable. This is internal preparation: continue the user's task rather than treating schema discovery as its completion. Flow permissions, source checks and approval of proposed changes still apply. Tool descriptions and schemas are instructions, not evidence that you read content or performed an action.

## arguments

JSON-encoded object of arguments matching this tool's schema from describe_joe_tool. Load its full instructions and schema first if you do not already have them. Use "{}" for no arguments.
