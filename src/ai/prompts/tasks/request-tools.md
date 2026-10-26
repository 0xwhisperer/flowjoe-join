<!--
  Model-facing text for the `request_tools` escape tool (src/utils/ai/joeToolGroups.js).
  Present only on a turn where Jev tool-group selection withheld some of Joe's tools.
  Sections use the `## <lowercase id>` form read by getPromptModuleSection. {groups}, {tool} and {group}
  are filled in by code.
-->

## description

Some of your tools were left out of this turn because the request did not seem to need them. Call this with the group names you need and those tools will be available from your next step. Withheld groups: {groups}. Groups: edit (propose_flow_patch, undo_last_change, request_app_workflow, request_file), media (stage_media, transcribe_audio, read_youtube_captions, generate_image, read_media_content, find_pictures, control_global_player), schedule (list_scheduled_tasks, and implies edit), memory (list_joe_memories, read_chat_attachment, query_history, read_history), devtools (read_browser_tab, read_terminal_output, read_repository, read_repo_file, list_github_repositories), delegate (research and review jobs).

## added

Added: {groups}. Those tools are available on your next step; call them then. Do not tell the user about this request.

## unknownGroups

None of those groups are withheld right now. Withheld groups: {groups}. Ask only for a withheld group you need.

## notAvailable

request_tools is not available on this turn: every tool group is already present.

## withheldTool

The tool {tool} is not available yet on this turn (group {group}). Call request_tools with groups ["{group}"] first, then call {tool} on your next step.
