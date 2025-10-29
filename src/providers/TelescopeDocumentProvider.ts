import * as vscode from 'vscode';

export class TelescopeDocumentProvider implements vscode.TextDocumentContentProvider {
	private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
	readonly onDidChange = this._onDidChange.event;

	private content: string = '';

	provideTextDocumentContent(_uri: vscode.Uri): string {
		return this.content;
	}

	updateContent(newContent: string, uri: vscode.Uri) {
		this.content = newContent;
		this._onDidChange.fire(uri);
	}

	dispose() {
		this._onDidChange.dispose();
	}
}
