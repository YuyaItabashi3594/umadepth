# Project Rules & Constraints

## General
Always respond in Japanese 日本語で回答してください。

## Environment Context
- **OS**: Windows 11 (PowerShell/Command Prompt)
- **Framework**: Vue 3 + Vite + TypeScript
- **Package Manager**: npm (or pnpm/yarn - 常用するものに合わせて変更)

## Critical Safety Rules (DO NOT BYPASS)
- **Command Prohibition**: NEVER execute destructive commands without explicit user confirmation.
- **Prohibited Patterns**:
- `rm -rf` (Unix-style)
- `Remove-Item -Recurse -Force` (PowerShell)
- `rd /s /q` or `del /s /q` (CMD)
- **Safety Protocol**:
- Before deleting any directory or multiple files, list the target files and wait for user approval.
- If a file needs to be cleared, prefer truncating or empty string overwriting unless deletion is strictly necessary.

## Development Guidelines
- Always use `Get-ChildItem` instead of `ls` if complex filtering is needed in PowerShell.
- Use `\` as the path separator in shell commands, but use `/` in TypeScript/Vite imports.
- Ensure all new components follow the Vue 3 `<script setup>` syntax.

## Terminal Preferences
- Use PowerShell-native commands where possible.
- Avoid using `sudo` (not applicable in Windows). Use `Start-Process -Verb RunAs` logic only if administrative tasks are explicitly requested.