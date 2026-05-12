import {
	Connection,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams
} from 'vscode-languageserver/node';
import { KEYWORDS, symbolTable } from './symbols';

export function registerCompletionHandlers(connection: Connection): void {
	connection.onCompletion(
		(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
			const items: CompletionItem[] = [];

			// Add keywords
			KEYWORDS.forEach(keyword => {
				items.push({
					label: keyword,
					kind: CompletionItemKind.Keyword,
					data: keyword
				});
			});

			// Add symbols from current document
			const documentSymbols = symbolTable.get(_textDocumentPosition.textDocument.uri);
			if (documentSymbols) {
				documentSymbols.forEach((symbol, name) => {
					let kind: CompletionItemKind = CompletionItemKind.Variable;
					if (symbol.kind === 'function') kind = CompletionItemKind.Function;
					else if (symbol.kind === 'class') kind = CompletionItemKind.Class;
					else if (symbol.kind === 'interface') kind = CompletionItemKind.Interface;

					items.push({
						label: name,
						kind: kind,
						data: name
					});
				});
			}

			return items;
		}
	);

	connection.onCompletionResolve(
		(item: CompletionItem): CompletionItem => {
			if (KEYWORDS.has(item.data)) {
				item.detail = 'ALang keyword';
				item.documentation = `ALang keyword: ${item.data}`;
			}
			return item;
		}
	);
}
