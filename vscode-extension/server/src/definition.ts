import {
	Connection,
	TextDocuments,
	Definition,
	TextDocumentPositionParams
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { symbolTable } from './symbols';

export function registerDefinitionHandler(connection: Connection, documents: TextDocuments<TextDocument>): void {
	connection.onDefinition((params: TextDocumentPositionParams): Definition | null => {
		const document = documents.get(params.textDocument.uri);
		if (!document) {
			return null;
		}

		const text = document.getText();
		const lines = text.split('\n');
		const line = lines[params.position.line];

		// Get the word at the cursor position
		const wordMatch = line.substring(0, params.position.character).match(/[a-zA-Z_][a-zA-Z0-9_]*$/);
		if (!wordMatch) {
			return null;
		}

		const word = wordMatch[0];

		// Look up in symbol table
		const documentSymbols = symbolTable.get(params.textDocument.uri);
		if (documentSymbols && documentSymbols.has(word)) {
			const symbol = documentSymbols.get(word)!;
			return symbol.location;
		}

		return null;
	});
}
