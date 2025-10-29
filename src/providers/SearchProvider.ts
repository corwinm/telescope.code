export interface SearchResult {
	filePath: string;
	line: number;
	column: number;
	text: string;
}

export interface SearchProvider {
	search(query: string): Promise<SearchResult[]>;
}
