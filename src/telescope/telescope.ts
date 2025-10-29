import * as vscode from "vscode";
import { SearchProvider, SearchResult } from "../providers/SearchProvider";
import { WorkspaceTextSearchProvider } from "../providers/WorkspaceTextSearchProvider";

export class TelescopeController {
  private disposables: vscode.Disposable[] = [];
  private telescopeEditor?: vscode.TextEditor;
  private changeListener?: vscode.Disposable;
  private selectionListener?: vscode.Disposable;
  private debounceTimer?: NodeJS.Timeout;
  private readonly debounceDelay = 300;
  private isRestoringCursor = false;
  private isPreventingEdit = false;
  private searchProvider: SearchProvider = new WorkspaceTextSearchProvider();
  private currentResults: SearchResult[] = [];
  private isUpdatingResults = false;
  private selectedIndex: number = 0;
  private inputLineIndex: number = 0;

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.changeListener?.dispose();
    this.selectionListener?.dispose();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  async show() {
    this.currentResults = [];
    this.selectedIndex = 0;
    this.isUpdatingResults = false;
    this.isPreventingEdit = false;
    this.isRestoringCursor = false;

    const uri = vscode.Uri.parse("untitled:telescope");
    const doc = await vscode.workspace.openTextDocument(uri);

    await vscode.languages.setTextDocumentLanguage(doc, "telescope");

    const initialContent = "> ";
    
    const edit = new vscode.WorkspaceEdit();
    edit.insert(doc.uri, new vscode.Position(0, 0), initialContent);
    await vscode.workspace.applyEdit(edit);

    this.telescopeEditor = await vscode.window.showTextDocument(doc, {
      preview: false,
      preserveFocus: false,
      viewColumn: vscode.ViewColumn.Active,
    });

    await vscode.commands.executeCommand(
      "setContext",
      "editorLineNumbers",
      "off"
    );

    this.inputLineIndex = 0;
    const inputLineLength = this.telescopeEditor.document.lineAt(this.inputLineIndex).text.length;
    this.telescopeEditor.selection = new vscode.Selection(
      this.inputLineIndex,
      inputLineLength,
      this.inputLineIndex,
      inputLineLength
    );

    this.setupListeners();
  }

  private getSampleContent(): string {
    return "> ";
  }

  private setupListeners() {
    this.changeListener?.dispose();
    this.selectionListener?.dispose();

    this.changeListener = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === this.telescopeEditor?.document) {
        this.handleDocumentChange(e);
      }
    });

    this.selectionListener = vscode.window.onDidChangeTextEditorSelection(
      (e) => {
        if (e.textEditor === this.telescopeEditor) {
          this.handleSelectionChange(e);
        }
      }
    );
  }

  private async handleDocumentChange(e: vscode.TextDocumentChangeEvent) {
    if (this.isPreventingEdit || this.isUpdatingResults) {
      return;
    }

    const doc = e.document;

    for (const change of e.contentChanges) {
      const changeStartLine = change.range.start.line;
      const changeEndLine = change.range.end.line;

      if (changeStartLine !== this.inputLineIndex && changeEndLine !== this.inputLineIndex) {
        return;
      }
    }

    const inputLine = doc.lineAt(this.inputLineIndex);

    if (!inputLine.text.startsWith("> ")) {
      this.isPreventingEdit = true;
      await this.restoreInputMarker(doc, this.inputLineIndex);
      this.isPreventingEdit = false;
      return;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processInputChange(doc);
    }, this.debounceDelay);
  }

  private async restoreInputMarker(
    doc: vscode.TextDocument,
    inputLineIndex: number
  ) {
    if (!this.telescopeEditor) {
      return;
    }

    const edit = new vscode.WorkspaceEdit();
    const inputLine = doc.lineAt(inputLineIndex);
    const currentText = inputLine.text;

    let newText = currentText;
    if (!currentText.startsWith("> ")) {
      if (currentText.startsWith(">")) {
        newText = "> " + currentText.substring(1);
      } else {
        newText = "> " + currentText;
      }
    }

    edit.replace(
      doc.uri,
      new vscode.Range(inputLineIndex, 0, inputLineIndex, inputLine.text.length),
      newText
    );

    await vscode.workspace.applyEdit(edit);

    const newPosition = new vscode.Position(
      inputLineIndex,
      Math.max(2, this.telescopeEditor.selection.active.character)
    );
    this.telescopeEditor.selection = new vscode.Selection(
      newPosition,
      newPosition
    );
  }

  private handleSelectionChange(e: vscode.TextEditorSelectionChangeEvent) {
    if (
      this.isRestoringCursor ||
      this.isUpdatingResults ||
      !this.telescopeEditor
    ) {
      return;
    }

    const selection = e.selections[0];
    const cursorLine = selection.active.line;
    const cursorChar = selection.active.character;

    if (cursorLine !== this.inputLineIndex) {
      this.isRestoringCursor = true;
      const inputLine = this.telescopeEditor.document.lineAt(this.inputLineIndex);
      const newPosition = new vscode.Position(
        this.inputLineIndex,
        inputLine.text.length
      );
      this.telescopeEditor.selection = new vscode.Selection(
        newPosition,
        newPosition
      );
      this.isRestoringCursor = false;
    } else if (cursorChar < 2) {
      this.isRestoringCursor = true;
      const newPosition = new vscode.Position(this.inputLineIndex, 2);
      this.telescopeEditor.selection = new vscode.Selection(
        newPosition,
        newPosition
      );
      this.isRestoringCursor = false;
    }
  }

  private async processInputChange(doc: vscode.TextDocument) {
    const query = this.extractSearchQuery(doc);
    if (query) {
      const results = await this.searchProvider.search(query);
      await this.updateResults(results);
    } else {
      await this.updateResults([]);
    }
  }

  private async updateResults(
    results: SearchResult[],
    resetSelection: boolean = true
  ) {
    if (!this.telescopeEditor || this.isUpdatingResults) {
      return;
    }

    this.isUpdatingResults = true;
    this.isPreventingEdit = true;
    this.currentResults = results;
    if (resetSelection) {
      this.selectedIndex = Math.max(0, results.length - 1);
    }

    const doc = this.telescopeEditor.document;
    const currentInputLine = doc.lineAt(this.inputLineIndex).text;

    const resultLines = results.map((r, index) => {
      const prefix = index === this.selectedIndex ? "> " : "  ";
      return `${prefix}${r.filePath}:${r.line}: ${r.text}`;
    });

    const newContent = [...resultLines, "", currentInputLine].join("\n");

    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
      0,
      0,
      doc.lineCount - 1,
      doc.lineAt(doc.lineCount - 1).text.length
    );
    edit.replace(doc.uri, fullRange, newContent);

    await vscode.workspace.applyEdit(edit);

    const inputLineIndex = resultLines.length + 1;
    const inputLineLength =
      this.telescopeEditor.document.lineAt(inputLineIndex).text.length;
    this.inputLineIndex = inputLineIndex;
    this.telescopeEditor.selection = new vscode.Selection(
      inputLineIndex,
      inputLineLength,
      inputLineIndex,
      inputLineLength
    );

    this.isUpdatingResults = false;
    this.isPreventingEdit = false;
  }

  private extractSearchQuery(doc: vscode.TextDocument): string {
    const inputLine = doc.lineAt(this.inputLineIndex);

    if (!inputLine.text.startsWith("> ")) {
      return "";
    }

    return inputLine.text.substring(2).trim();
  }

  async selectResult() {
    if (!this.telescopeEditor || this.currentResults.length === 0) {
      return;
    }

    const result = this.currentResults[this.selectedIndex];
    await this.openFile(result.filePath, result.line);
  }

  moveSelectionUp() {
    if (this.currentResults.length === 0) {
      return;
    }

    this.selectedIndex = this.selectedIndex - 1;
    if (this.selectedIndex < 0) {
      this.selectedIndex = this.currentResults.length - 1;
    }

    this.updateResults(this.currentResults, false);
  }

  moveSelectionDown() {
    if (this.currentResults.length === 0) {
      return;
    }

    this.selectedIndex = this.selectedIndex + 1;
    if (this.selectedIndex >= this.currentResults.length) {
      this.selectedIndex = 0;
    }

    this.updateResults(this.currentResults, false);
  }

  private async openFile(relativePath: string, lineNumber: number) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return;
    }

    const fullPath = vscode.Uri.joinPath(workspaceFolders[0].uri, relativePath);

    try {
      await this.closeTelescopeEditor();

      const doc = await vscode.workspace.openTextDocument(fullPath);
      const line = Math.max(0, lineNumber - 1);
      const editor = await vscode.window.showTextDocument(doc);

      const position = new vscode.Position(line, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(
        new vscode.Range(position, position),
        vscode.TextEditorRevealType.InCenter
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${relativePath}`);
    }
  }

  private async closeTelescopeEditor() {
    if (this.telescopeEditor) {
      await vscode.commands.executeCommand(
        "workbench.action.revertAndCloseActiveEditor"
      );
      this.telescopeEditor = undefined;
    }
    this.changeListener?.dispose();
    this.selectionListener?.dispose();
  }
}
