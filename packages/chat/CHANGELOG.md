# Changelog

## Unreleased

- Render tools without a prebuilt widget (`GenericToolWidget`) as the same inline row as the prebuilt tools. The expanded body shows only the result, or the error once, instead of the call's input and output as JSON.
- `ToolFrame` leaves out the body and chevron when a row has nothing to expand.

## 0.0.2

- Add Symphony protocol 3 tool widget support, including `ask_user` question and answer rendering.
- Improve file, search, patch, and subagent tool rows and their running, completed, approval, and error states.
- Improve composer host integration, attachment handling, message wrapping, and scroll behavior.
- Add artifact cards with safe file/image previews and integrated subagent activity inspection.
- Include this changelog in the published package.
- Require protocol `0.0.3` for artifact, subagent, context, and usage helpers; verify packed ESM and CommonJS consumers in CI.

## 0.0.1

- Initial public release of the embeddable React chat UI and widget package.
