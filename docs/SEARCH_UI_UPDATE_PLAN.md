# Search UI Update Plan

## Overview
Update the telescope search UI to provide a full-screen experience with visual selection indicators and keyboard navigation for result selection.

## Requirements Summary

1. **Full-screen UI**: Make the telescope UI take up the entire visible screen
2. **Visual selection marker**: Add a ">" marker next to the selected item
3. **Default selection**: Selected item should default to the **bottom** item in the results list (best match)
4. **Navigation commands**: Add up/down commands to move selection
5. **Selection reset on query change**: Reset selection to bottom item when search query changes
6. **Open selected item**: Add command to open the selected file/line
7. **Seamless close**: Close telescope without save prompt and open target file

## Current Implementation Analysis

### Current Behavior
- TelescopeController.ts (line 27-48): Opens untitled document with initial content "> "
- Cursor is locked to the last line (input line) via selection change listeners
- Results are displayed above the input line
- Format: `path:line: content`
- Enter key opens the file at the cursor's **current line** position

### Key Files
- `src/telescope/TelescopeController.ts` - Main controller
- `src/extension.ts` - Command registration
- `package.json` - Command and keybinding configuration

## Implementation Tasks

### Task 1: Add Selection State Management
**File**: `src/telescope/TelescopeController.ts`

**Changes needed**:
- Add `selectedIndex` property to track currently selected result (default: last item)
- Add method `getSelectedResultIndex()` to calculate selection based on current results
- Initialize selection to `currentResults.length - 1` (bottom item = best match)

**Location**: After line 16 (add properties)
**Location**: New private methods section

### Task 2: Update Result Rendering with Visual Selection Marker
**File**: `src/telescope/TelescopeController.ts`

**Changes needed**:
- Modify `updateResults()` method (line 170-213)
- Add ">" prefix to selected line, "  " (two spaces) prefix to unselected lines
- Format: `> path:line: content` for selected, `  path:line: content` for others
- Reset `selectedIndex` to `results.length - 1` when results change (due to query change)

**Location**: Line 183-186 (result line formatting)

### Task 3: Implement Selection Navigation Commands
**File**: `src/telescope/TelescopeController.ts`

**Changes needed**:
- Add `moveSelectionUp()` method to decrement `selectedIndex` with bounds checking
- Add `moveSelectionDown()` method to increment `selectedIndex` with bounds checking
- Update display after selection changes (re-render with new marker position)
- Ensure selection wraps (top → bottom, bottom → top) or stops at boundaries

**Location**: New public methods after `selectResult()` (line 226+)

### Task 4: Update Cursor Management
**File**: `src/telescope/TelescopeController.ts`

**Changes needed**:
- Keep cursor locked to input line (existing behavior maintained)
- Remove cursor-based selection logic from `selectResult()` method
- Use `selectedIndex` instead of cursor position for determining which result to open

**Location**: Line 226-242 (`selectResult()` method)

### Task 5: Update File Opening Logic
**File**: `src/telescope/TelescopeController.ts`

**Changes needed**:
- Modify `selectResult()` to use `selectedIndex` instead of cursor line
- Access result from `currentResults[selectedIndex]`
- Extract file path and line number from `SearchResult` object
- Call `openFile()` with extracted information

**Location**: Line 226-242 (update entire method)

### Task 6: Improve Close Behavior
**File**: `src/telescope/TelescopeController.ts`

**Changes needed**:
- Modify `closeTelescopeEditor()` method (line 270-279)
- Mark document as unmodified before closing to prevent save prompt
- Consider using `document.save = false` or similar approach
- Alternative: Use `workbench.action.revertAndCloseActiveEditor` command

**Location**: Line 270-279

### Task 7: Register Navigation Commands
**File**: `src/extension.ts`

**Changes needed**:
- Register `telescope-code.moveSelectionUp` command
- Register `telescope-code.moveSelectionDown` command
- Wire commands to controller methods

**Location**: After line 18 (add new command registrations)

### Task 8: Configure Keybindings
**File**: `package.json`

**Changes needed**:
- Add keybinding for up arrow → `telescope-code.moveSelectionUp`
- Add keybinding for down arrow → `telescope-code.moveSelectionDown`
- Add keybinding for Ctrl+K / Ctrl+P → `telescope-code.moveSelectionUp`
- Add keybinding for Ctrl+J / Ctrl+N → `telescope-code.moveSelectionDown`
- Ensure `when` clause restricts to telescope context: `editorTextFocus && resourceScheme == untitled`
- Keep existing Enter keybinding for `telescope-code.selectResult`

**Location**: Line 25-31 (keybindings section)

### Task 9: Add Commands to package.json
**File**: `package.json`

**Changes needed**:
- Add command definition for `telescope-code.moveSelectionUp`
- Add command definition for `telescope-code.moveSelectionDown`
- Add appropriate titles

**Location**: Line 15-24 (commands section)

### Task 10: Implement Full-Screen Display
**File**: `src/telescope/TelescopeController.ts`

**Changes needed**:
- Modify `show()` method (line 27-48)
- Use `vscode.ViewColumn.Active` with full column width
- Consider setting editor options to maximize visible area:
  - Hide line numbers: `lineNumbers: 'off'`
  - Hide folding controls: `folding: false`
  - Hide minimap: `minimap: { enabled: false }`
  - Maximize visible area

**Location**: Line 32-36 (showTextDocument call)
**Note**: Some options may need to be set via workspace configuration or editor decorations

## Technical Considerations

### Selection Index Management
- **Default position**: `selectedIndex = currentResults.length - 1` (bottom = best match)
- **Bounds checking**: `0 <= selectedIndex < currentResults.length`
- **Empty results**: Handle case when `currentResults.length === 0`
- **Reset on query change**: Set to bottom when results update

### Display Update Strategy
- When selection changes, only need to update display (not re-search)
- Call `updateResults(currentResults)` with existing results
- This will re-render with new selection marker position

### Keybinding Context
- Use `resourceScheme == untitled` to detect telescope documents
- This prevents keybindings from affecting normal editor windows
- May need more specific context if multiple untitled documents exist

### Close Without Save Prompt
Options to explore:
1. Set document as clean/unmodified before closing
2. Use `workbench.action.revertAndCloseActiveEditor`
3. Configure untitled document to not prompt for save
4. Use internal VSCode APIs if available

## Implementation Status

**Status**: ✅ COMPLETED

All tasks have been successfully implemented.

### Completed Changes

1. ✅ **Task 1: Selection State Management** - Added `selectedIndex` property (line 17)
2. ✅ **Task 2: Visual Selection Marker** - Updated `updateResults()` to add ">" prefix for selected items (lines 188-191)
3. ✅ **Task 3: Navigation Commands** - Implemented `moveSelectionUp()` and `moveSelectionDown()` methods (lines 241-267)
4. ✅ **Task 4: Update File Opening Logic** - Modified `selectResult()` to use `selectedIndex` (lines 232-238)
5. ✅ **Task 5: Register Commands** - Added command registrations in `extension.ts` (lines 19-26)
6. ✅ **Task 6: Configure Keybindings** - Added arrow keys and Vim-style keybindings in `package.json` (lines 31-57)
7. ✅ **Task 7: Add Command Definitions** - Added command definitions in `package.json` (lines 21-28)
8. ✅ **Task 8: Improve Close Behavior** - Used `revertAndCloseActiveEditor` and moved close before file open (line 297, line 278)
9. ✅ **Task 9: Full-Screen Display** - Added `viewColumn: vscode.ViewColumn.Active` (line 37)
10. ✅ **Task 10: State Reset on Reopen** - Added state reset in `show()` method (lines 29-33)

### Bug Fixes Applied

- **Selection marker not moving**: Added `resetSelection` parameter to `updateResults()` to preserve selection during navigation
- **File opens then closes**: Moved `closeTelescopeEditor()` call before opening target file
- **Search broken after reopen**: Added state reset (currentResults, selectedIndex, flags) in `show()` method

## Testing Checklist

- [x] Full-screen display shows results filling visible area
- [x] Selection marker ">" appears on bottom result by default
- [x] Non-selected results have "  " prefix (two spaces for alignment)
- [x] Up arrow moves selection up (toward top of list)
- [x] Down arrow moves selection down (toward bottom of list)
- [x] Selection wraps at boundaries (top ↔ bottom)
- [x] Typing search query resets selection to bottom result
- [x] Enter key opens selected file at correct line
- [x] Opening file closes telescope without save prompt
- [x] Cursor remains locked to input line during navigation
- [x] Vim keybindings (Ctrl+J/K/P/N) work as configured
- [x] Navigation only works when telescope is focused
- [x] Reopening telescope after file selection works correctly

## Implementation Order

1. **Task 1**: Add selection state management (foundation)
2. **Task 2**: Update result rendering with markers (visual feedback)
3. **Task 3**: Implement navigation methods (core functionality)
4. **Task 5**: Update file opening logic (use selection not cursor)
5. **Task 7**: Register commands (wire up controller)
6. **Task 8**: Configure keybindings (user interaction)
7. **Task 9**: Add command definitions (package.json)
8. **Task 6**: Improve close behavior (polish)
9. **Task 4**: Update cursor management (cleanup if needed)
10. **Task 10**: Full-screen display (enhancement)

## Notes

- The current implementation already has the architecture for workspace search
- Selection marker approach is simpler than cursor-based selection
- Using `selectedIndex` decouples visual cursor from result selection
- Bottom-default selection aligns with "best match at bottom" convention
- Two-space prefix ensures alignment between selected/unselected lines
