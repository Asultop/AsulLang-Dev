import {
	Connection,
	DocumentSymbol,
	SymbolInformation,
	TextDocument,
	TextDocuments,
	SymbolKind
} from 'vscode-languageserver/node';

// Map symbol kinds from our internal representation to LSP SymbolKind
function mapSymbolKind(kind: 'function' | 'class' | 'variable' | 'interface'): SymbolKind {
	switch (kind) {
		case 'function': return SymbolKind.Function;
		case 'class': return SymbolKind.Class;
		case 'interface': return SymbolKind.Interface;
		case 'variable': return SymbolKind.Variable;
		default: return SymbolKind.Variable;
	}
}

export function registerDocumentSymbolHandler(
	connection: Connection,
	documents: TextDocuments<TextDocument>
): void {
	connection.onDocumentSymbol((params): DocumentSymbol[] | null => {
		const document = documents.get(params.textDocument.uri);
		if (!document) {
			return null;
		}

		const text = document.getText();
		const lines = text.split('\n');
		const symbols: DocumentSymbol[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const trimmed = line.trim();

			// Skip comments
			if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
				continue;
			}

			// Function definitions: function name(...) or fn name(...)
			const funcMatch = line.match(/^\s*(?:function|fn)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
			if (funcMatch) {
				const name = funcMatch[1];
				symbols.push({
					name: name,
					kind: SymbolKind.Function,
					range: {
						start: { line: i, character: 0 },
						end: { line: i, character: line.length }
					},
					selectionRange: {
						start: { line: i, character: line.indexOf(name) },
						end: { line: i, character: line.indexOf(name) + name.length }
					}
				});
				continue;
			}

			// Class definitions: class ClassName
			const classMatch = line.match(/^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
			if (classMatch) {
				const name = classMatch[1];
				symbols.push({
					name: name,
					kind: SymbolKind.Class,
					range: {
						start: { line: i, character: 0 },
						end: { line: i, character: line.length }
					},
					selectionRange: {
						start: { line: i, character: line.indexOf(name) },
						end: { line: i, character: line.indexOf(name) + name.length }
					}
				});
				continue;
			}

			// Interface definitions: interface InterfaceName
			const interfaceMatch = line.match(/^\s*interface\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
			if (interfaceMatch) {
				const name = interfaceMatch[1];
				symbols.push({
					name: name,
					kind: SymbolKind.Interface,
					range: {
						start: { line: i, character: 0 },
						end: { line: i, character: line.length }
					},
					selectionRange: {
						start: { line: i, character: line.indexOf(name) },
						end: { line: i, character: line.indexOf(name) + name.length }
					}
				});
			}
		}

		return symbols;
	});
}