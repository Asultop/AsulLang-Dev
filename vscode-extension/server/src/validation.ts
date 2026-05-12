import { Connection, TextDocuments, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getDocumentSettings } from './settings';
import { extractSymbols, symbolTable } from './symbols';

export function createValidator(connection: Connection, documents: TextDocuments<TextDocument>) {
	return async function validateTextDocument(textDocument: TextDocument): Promise<void> {
		const settings = await getDocumentSettings(textDocument.uri, connection);
		const text = textDocument.getText();
		const diagnostics: Diagnostic[] = [];

		// Extract symbols
		const documentSymbols = extractSymbols(textDocument);
		symbolTable.set(textDocument.uri, documentSymbols);

		// Basic syntax checking
		const lines = text.split('\n');
		for (let i = 0; i < lines.length && diagnostics.length < settings.maxNumberOfProblems; i++) {
			const line = lines[i];

			// Check for unclosed double quotes
			const doubleQuotes = (line.match(/(?<!\\)"/g) || []).length;
			if (doubleQuotes % 2 !== 0 && !line.trim().startsWith('//') && !line.trim().startsWith('#')) {
				diagnostics.push({
					severity: DiagnosticSeverity.Error,
					range: {
						start: { line: i, character: 0 },
						end: { line: i, character: line.length }
					},
					message: `Unclosed double quote`,
					source: 'alang'
				});
			}

			// Check for unclosed single quotes
			const singleQuotes = (line.match(/(?<!\\)'/g) || []).length;
			if (singleQuotes % 2 !== 0 && !line.trim().startsWith('//') && !line.trim().startsWith('#')) {
				diagnostics.push({
					severity: DiagnosticSeverity.Error,
					range: {
						start: { line: i, character: 0 },
						end: { line: i, character: line.length }
					},
					message: `Unclosed single quote`,
					source: 'alang'
				});
			}
		}

		connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
	};
}
