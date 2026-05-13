import {
	Connection,
	Hover,
	TextDocumentPositionParams,
	MarkupKind,
	TextDocuments
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { symbolTable, KEYWORDS } from './symbols';

// ALang built-in types and their documentation
const builtinTypes: Record<string, string> = {
	'string': 'A sequence of characters. Methods: split, substring, replace, trim, toUpperCase, toLowerCase',
	'number': 'A numeric value. Methods: abs, floor, ceil, round, sqrt, pow',
	'boolean': 'A boolean value (true/false)',
	'array': 'An ordered collection. Methods: map, filter, reduce, push, pop, slice',
	'object': 'A collection of key-value pairs',
	'Promise': 'Represents an async operation. Methods: then, catch, finally',
	'Map': 'A collection of key-value pairs. Methods: set, get, has, delete, size',
	'Set': 'A collection of unique values. Methods: add, has, delete, size'
};

const builtinFunctions: Record<string, string> = {
	'print': 'print(...args): Print values to stdout without newline',
	'println': 'println(...args): Print values to stdout with newline',
	'len': 'len(x): Get the length of a string, array, or object',
	'sleep': 'sleep(ms): Returns a Promise that resolves after ms milliseconds',
	'eval': 'eval(code): Execute ALang code from a string',
	'quote': 'quote(code): Parse ALang code and return Token array'
};

export function registerHoverHandler(connection: Connection, documents: TextDocuments<TextDocument>): void {
	connection.onHover((params: TextDocumentPositionParams): Hover | null => {
		const document = documents.get(params.textDocument.uri);
		if (!document) {
			return null;
		}

		const text = document.getText();
		const word = getWordAtPosition(params.position, text);

		// Check if it's a built-in type
		if (builtinTypes[word]) {
			return {
				contents: {
					kind: MarkupKind.Markdown,
					value: `**${word}**\n\n${builtinTypes[word]}`
				}
			};
		}

		// Check if it's a built-in function
		if (builtinFunctions[word]) {
			return {
				contents: {
					kind: MarkupKind.Markdown,
					value: `**${word}**\n\n${builtinFunctions[word]}`
				}
			};
		}

		// Check if it's a keyword
		if (KEYWORDS.has(word)) {
			return {
				contents: {
					kind: MarkupKind.Markdown,
					value: `**${word}**\n\nALang keyword`
				}
			};
		}

		// Check symbol table
		const docSymbols = symbolTable.get(params.textDocument.uri);
		const symbol = docSymbols ? docSymbols.get(word) : undefined;
		if (symbol) {
			return {
				contents: {
					kind: MarkupKind.Markdown,
					value: `**${symbol.kind}: ${word}**`
				}
			};
		}

		return null;
	});
}

function getWordAtPosition(position: { line: number; character: number }, text: string): string {
	const lines = text.split('\n');
	const line = lines[position.line];
	const before = line.substring(0, position.character);
	const after = line.substring(position.character);

	const wordStart = before.search(/[a-zA-Z_][a-zA-Z0-9_]*$/);
	const wordEnd = after.search(/[^a-zA-Z0-9_]/);

	if (wordStart === -1) return '';

	const start = wordStart;
	const end = wordEnd === -1 ? line.length : wordEnd + start;

	return line.substring(start, end);
}