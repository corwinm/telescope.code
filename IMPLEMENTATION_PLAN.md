# Telescope VSCode Extension - Implementation Plan

## Overview
Create a telescope-style search extension using a text document as the UI, allowing full editor functionality including vim keybindings.

## Architecture Approach
- Use untitled editable document for search UI (TextDocumentContentProvider creates read-only documents)
- Watch document changes to capture search input
- Update document with results above input line
- Enable full editor features (VSCodeVim, custom keybindings, etc.)

## High Priority Tasks (Core Foundation)

### 1. ✅ Create editable document for search UI
- ~~Implement `TextDocumentContentProvider` with custom URI scheme (e.g., `telescope:`)~~ (Not used - creates read-only document)
- Use `workspace.openTextDocument` with untitled document for editability
- Initialize with sample content and input prompt "> "

### 2. ✅ Implement real-time text document watching for search input changes
- ✅ Use `workspace.onDidChangeTextDocument` to monitor changes
- ✅ Extract search query from bottom line (after "> " marker)
- ✅ Debounce input for performance (300ms delay)
- ✅ Protect input marker "> " from deletion

### 3. ✅ Create workspace text search provider for initial search source
- ✅ Implement search interface/abstract class
- ✅ Use VSCode's workspace search API (using `workspace.findFiles` + text search)
- ✅ Return results with file path, line number, and content

### 4. ✅ Implement result rendering: update document with matches above input line
- ✅ Format results as readable lines (path:linenum: content)
- ✅ Use `WorkspaceEdit` to update virtual document
- ✅ Keep input line at bottom, results above

### 5. ✅ Add cursor management: keep input on bottom line, prevent editing results
- ✅ Monitor cursor position changes with `window.onDidChangeTextEditorSelection`
- ✅ Automatically constrain cursor to input line (last line)
- ✅ Prevent cursor from moving before column 2 (before "> " marker)
- ~~Allow cursor to move to result lines for selection~~ (Changed: cursor always constrained to input line)

### 6. Implement result selection: detect cursor movement to result lines
- Use `window.onDidChangeTextEditorSelection` to track selection
- Parse selected result line to extract file/line info
- Highlight selected result

### 7. Handle Enter key: open file at matching line when on result
- Register command for Enter key activation
- Parse result line format
- Use `window.showTextDocument` with selection range
- Focus matching line in opened file

### 8. ✅ Add read-only protection for result lines (only input line editable)
- ✅ Implement check in `workspace.onDidChangeTextDocument` for edit validation
- ✅ Prevent modifications to result lines by ignoring edits above last line
- ✅ Allow only input line editing

### 9. Add command to trigger telescope search and open search document
- Register `telescope.search` command
- Open virtual document in editor
- Set initial cursor position to input line
- Configure editor settings (no line numbers, etc.)

## Medium Priority Tasks (Architecture & Performance)

### 10. Create pluggable search provider architecture for switching sources
- Define search provider interface
- Implement provider registry
- Support multiple search types (text, files, symbols, buffers)
- Add commands to switch between providers

### 11. Implement debouncing and incremental search for performance
- Add debounce utility for input changes
- Implement result streaming/pagination
- Limit initial result count
- Add loading indicators

### 12. Implement search session cleanup and document disposal
- Clean up event listeners on document close
- Dispose providers properly
- Handle multiple concurrent search sessions
- Clear cached results

## Technical Details

### Document Format
```
/path/to/file1.ts:42: matching line content here
/path/to/file2.ts:15: another match here
/path/to/file3.ts:8: third match

search query here█
```

### Key Components
- `TelescopeController` - Main orchestrator with cursor/edit management
- `SearchProvider` - Abstract search interface
- `WorkspaceTextSearchProvider` - Text search implementation (stub)
- `TelescopeDocumentProvider` - Created but not used (read-only limitation)
- Untitled editable document for search UI
- Event listeners for document changes and cursor movement

### VSCode APIs Used
- ~~`vscode.workspace.registerTextDocumentContentProvider`~~ (Not used - creates read-only documents)
- `vscode.workspace.openTextDocument` (with untitled document)
- `vscode.workspace.onDidChangeTextDocument` (input change monitoring)
- `vscode.window.onDidChangeTextEditorSelection` (cursor constraint)
- `vscode.workspace.findTextInFiles` (to be implemented)
- `vscode.window.showTextDocument`
- `vscode.WorkspaceEdit` (for restoring input marker)
- `vscode.commands.registerCommand`

## Future Enhancements
- Live preview of selected result
- Multi-file selection
- Search history
- Custom search scopes
- Fuzzy file finder
- Symbol search
- Git status search
