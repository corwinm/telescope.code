import * as vscode from 'vscode';
import { SearchProvider, SearchResult } from '../providers/SearchProvider';
import { WorkspaceTextSearchProvider } from '../providers/WorkspaceTextSearchProvider';

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

	dispose() {
		this.disposables.forEach(d => d.dispose());
		this.changeListener?.dispose();
		this.selectionListener?.dispose();
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
	}

	async show() {
		const doc = await vscode.workspace.openTextDocument({
			content: this.getSampleContent(),
			language: 'plaintext'
		});

		this.telescopeEditor = await vscode.window.showTextDocument(doc, {
			preview: false,
			preserveFocus: false
		});

		const lastLine = doc.lineCount - 1;
		const lastLineLength = doc.lineAt(lastLine).text.length;
		this.telescopeEditor.selection = new vscode.Selection(
			lastLine,
			lastLineLength,
			lastLine,
			lastLineLength
		);

		this.setupListeners();
	}

	private getSampleContent(): string {
		return '> ';
	}

	private setupListeners() {
		this.changeListener?.dispose();
		this.selectionListener?.dispose();

		this.changeListener = vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document === this.telescopeEditor?.document) {
				this.handleDocumentChange(e);
			}
		});

		this.selectionListener = vscode.window.onDidChangeTextEditorSelection(e => {
			if (e.textEditor === this.telescopeEditor) {
				this.handleSelectionChange(e);
			}
		});
	}

	private async handleDocumentChange(e: vscode.TextDocumentChangeEvent) {
		if (this.isPreventingEdit || this.isUpdatingResults) {
			return;
		}

		const doc = e.document;
		const lastLineIndex = doc.lineCount - 1;
		const lastLine = doc.lineAt(lastLineIndex);

		for (const change of e.contentChanges) {
			const changeStartLine = change.range.start.line;
			const changeEndLine = change.range.end.line;
			
			if (changeStartLine < lastLineIndex) {
				return;
			}
		}

		if (!lastLine.text.startsWith('> ')) {
			this.isPreventingEdit = true;
			await this.restoreInputMarker(doc, lastLineIndex);
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

	private async restoreInputMarker(doc: vscode.TextDocument, lastLineIndex: number) {
		if (!this.telescopeEditor) {
			return;
		}

		const edit = new vscode.WorkspaceEdit();
		const lastLine = doc.lineAt(lastLineIndex);
		const currentText = lastLine.text;
		
		let newText = currentText;
		if (!currentText.startsWith('> ')) {
			if (currentText.startsWith('>')) {
				newText = '> ' + currentText.substring(1);
			} else {
				newText = '> ' + currentText;
			}
		}

		edit.replace(
			doc.uri,
			new vscode.Range(lastLineIndex, 0, lastLineIndex, lastLine.text.length),
			newText
		);

		await vscode.workspace.applyEdit(edit);

		const newPosition = new vscode.Position(lastLineIndex, Math.max(2, this.telescopeEditor.selection.active.character));
		this.telescopeEditor.selection = new vscode.Selection(newPosition, newPosition);
	}

	private handleSelectionChange(e: vscode.TextEditorSelectionChangeEvent) {
		if (this.isRestoringCursor || this.isUpdatingResults || !this.telescopeEditor) {
			return;
		}

		const doc = this.telescopeEditor.document;
		const lastLineIndex = doc.lineCount - 1;
		const selection = e.selections[0];
		const cursorLine = selection.active.line;
		const cursorChar = selection.active.character;

		if (cursorLine !== lastLineIndex) {
			this.isRestoringCursor = true;
			const lastLine = doc.lineAt(lastLineIndex);
			const newPosition = new vscode.Position(lastLineIndex, lastLine.text.length);
			this.telescopeEditor.selection = new vscode.Selection(newPosition, newPosition);
			this.isRestoringCursor = false;
		} else if (cursorChar < 2) {
			this.isRestoringCursor = true;
			const newPosition = new vscode.Position(lastLineIndex, 2);
			this.telescopeEditor.selection = new vscode.Selection(newPosition, newPosition);
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

	private async updateResults(results: SearchResult[]) {
		if (!this.telescopeEditor || this.isUpdatingResults) {
			return;
		}

		this.isUpdatingResults = true;
		this.isPreventingEdit = true;
		this.currentResults = results;

		const doc = this.telescopeEditor.document;
		const lastLineIndex = doc.lineCount - 1;
		const lastLine = doc.lineAt(lastLineIndex).text;

		const resultLines = results.map(r => 
			`${r.filePath}:${r.line}: ${r.text}`
		);
		
		const newContent = [
			...resultLines,
			'',
			lastLine
		].join('\n');

		const edit = new vscode.WorkspaceEdit();
		const fullRange = new vscode.Range(
			0, 0,
			lastLineIndex, doc.lineAt(lastLineIndex).text.length
		);
		edit.replace(doc.uri, fullRange, newContent);
		
		await vscode.workspace.applyEdit(edit);

		const newLastLine = this.telescopeEditor.document.lineCount - 1;
		const newLastLineLength = this.telescopeEditor.document.lineAt(newLastLine).text.length;
		this.telescopeEditor.selection = new vscode.Selection(
			newLastLine,
			newLastLineLength,
			newLastLine,
			newLastLineLength
		);

		this.isUpdatingResults = false;
		this.isPreventingEdit = false;
	}

	private extractSearchQuery(doc: vscode.TextDocument): string {
		const lastLineIndex = doc.lineCount - 1;
		const lastLine = doc.lineAt(lastLineIndex);

		if (!lastLine.text.startsWith('> ')) {
			return '';
		}

		return lastLine.text.substring(2).trim();
	}

	async selectResult() {
		if (!this.telescopeEditor) {
			return;
		}

		const doc = this.telescopeEditor.document;
		const currentLine = this.telescopeEditor.selection.active.line;
		const lineText = doc.lineAt(currentLine).text;

		const match = lineText.match(/^(.+?):(\d+):/);
		if (!match) {
			return;
		}

		const [, filePath, lineNumber] = match;
		await this.openFile(filePath, parseInt(lineNumber, 10));
	}

	private async openFile(relativePath: string, lineNumber: number) {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return;
		}

		const fullPath = vscode.Uri.joinPath(workspaceFolders[0].uri, relativePath);

		try {
			const doc = await vscode.workspace.openTextDocument(fullPath);
			const line = Math.max(0, lineNumber - 1);
			const editor = await vscode.window.showTextDocument(doc);

			const position = new vscode.Position(line, 0);
			editor.selection = new vscode.Selection(position, position);
			editor.revealRange(
				new vscode.Range(position, position),
				vscode.TextEditorRevealType.InCenter
			);

			await this.closeTelescopeEditor();
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to open file: ${relativePath}`);
		}
	}

	private async closeTelescopeEditor() {
		if (this.telescopeEditor) {
			const doc = this.telescopeEditor.document;
			await vscode.window.showTextDocument(doc);
			await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
			this.telescopeEditor = undefined;
		}
		this.changeListener?.dispose();
		this.selectionListener?.dispose();
	}
}
