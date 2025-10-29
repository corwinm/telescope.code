import * as vscode from 'vscode';
import { SearchProvider, SearchResult } from './SearchProvider';

export class WorkspaceTextSearchProvider implements SearchProvider {
	private maxResults = 100;

	async search(query: string): Promise<SearchResult[]> {
		if (!query.trim()) {
			return [];
		}

		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return [];
		}

		const results: SearchResult[] = [];

		try {
			const files = await vscode.workspace.findFiles(
				'**/*',
				'**/node_modules/**',
				this.maxResults * 10
			);

			for (const file of files) {
				if (results.length >= this.maxResults) {
					break;
				}

				try {
					const doc = await vscode.workspace.openTextDocument(file);
					const text = doc.getText();
					const lines = text.split('\n');

					for (let i = 0; i < lines.length; i++) {
						if (results.length >= this.maxResults) {
							break;
						}

						const line = lines[i];
						const index = line.toLowerCase().indexOf(query.toLowerCase());
						
						if (index !== -1) {
							results.push({
								filePath: vscode.workspace.asRelativePath(file),
								line: i + 1,
								column: index,
								text: line.trim()
							});
						}
					}
				} catch (err) {
				}
			}
		} catch (error) {
			console.error('Search error:', error);
		}

		return results;
	}
}
