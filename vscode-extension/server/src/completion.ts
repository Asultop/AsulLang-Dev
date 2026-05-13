import {
	Connection,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocuments
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { KEYWORDS, symbolTable, TYPES, BUILTIN_FUNCTIONS } from './symbols';
import { STD_PACKAGES, ALL_PACKAGE_NAMES, getPackageExports } from './packages';

// Get the text before cursor on the current line
function getLinePrefix(document: TextDocument, position: { line: number; character: number }): string {
	const lines = document.getText().split('\n');
	if (position.line >= lines.length) return '';
	return lines[position.line].substring(0, position.character);
}

// Check if cursor is inside a string or comment
function isInCommentOrString(document: TextDocument, position: { line: number; character: number }): boolean {
	const lines = document.getText().split('\n');
	if (position.line >= lines.length) return false;
	const line = lines[position.line];
	const beforeCursor = line.substring(0, position.character);

	// Check for comment
	const commentIndex = beforeCursor.indexOf('//');
	if (commentIndex !== -1) return true;

	// Check for string (rough check - count quotes)
	const doubleQuotes = (beforeCursor.match(/(?<!\\)"/g) || []).length;
	if (doubleQuotes % 2 !== 0) return true;

	return false;
}

export function registerCompletionHandlers(connection: Connection, documents: TextDocuments<TextDocument>): void {
	connection.onCompletion(
		(params: TextDocumentPositionParams): CompletionItem[] => {
			const uri = params.textDocument.uri;
			const document = documents.get(uri);
			if (!document) return [];

			const linePrefix = getLinePrefix(document, params.position);

			// Skip if in comment or string
			if (isInCommentOrString(document, params.position)) {
				return [];
			}

			// Context 1: std. or std.something. - show package exports
			// Match patterns like: std. | std.math. | std.io.
			const stdMatch = linePrefix.match(/(?:^|\s)(std\.\w*)\.(\w*)$/);
			if (stdMatch) {
				const pkgName = stdMatch[1];
				const prefix = stdMatch[2];

				// If it's just "std.", list sub-packages
				if (pkgName === 'std' && !prefix) {
					const items: CompletionItem[] = [];

					// Add sub-packages
					Object.keys(STD_PACKAGES)
						.filter(pkg => pkg.startsWith('std.') && pkg.split('.').length === 2)
						.forEach(pkg => {
							const shortName = pkg.replace('std.', '');
							items.push({
								label: shortName,
								kind: CompletionItemKind.Module,
								detail: STD_PACKAGES[pkg].description,
								data: { type: 'subpackage', name: pkg }
							});
						});

					return items;
				}

				// Show exports for sub-packages like std.math, std.io, etc.
				const exports = getPackageExports(pkgName);
				if (exports) {
					return exports
						.filter(exp => !prefix || exp.toLowerCase().startsWith(prefix.toLowerCase()))
						.map(exp => ({
							label: exp,
							kind: CompletionItemKind.Field,
							detail: `${pkgName}.${exp}`,
							data: { type: 'export', name: exp, package: pkgName }
						}));
				}
			}

			// Context 2: import  - show package names
			const importMatch = linePrefix.match(/(?:^|\s)import\s+(\S*)$/);
			if (importMatch) {
				const prefix = importMatch[1];
				return ALL_PACKAGE_NAMES
					.filter(pkg => !prefix || pkg.toLowerCase().startsWith(prefix.toLowerCase()))
					.map(pkg => ({
						label: pkg,
						kind: CompletionItemKind.Module,
						detail: STD_PACKAGES[pkg].description,
						data: { type: 'package', name: pkg }
					}));
			}

			// Context 3: from package import  - show exports
			const fromImportMatch = linePrefix.match(/(?:^|\s)from\s+(\S+)\s+import\s+(\w*)$/);
			if (fromImportMatch) {
				const pkgName = fromImportMatch[1];
				const prefix = fromImportMatch[2];
				const exports = getPackageExports(pkgName);
				if (exports) {
					return exports
						.filter(exp => !prefix || exp.toLowerCase().startsWith(prefix.toLowerCase()))
						.map(exp => ({
							label: exp,
							kind: CompletionItemKind.Field,
							detail: `Export from ${pkgName}`,
							data: { type: 'export', name: exp, package: pkgName }
						}));
				}
			}

			// Context 4: simple packages like json. xml. csv. yaml.
			const simplePkgMatch = linePrefix.match(/(?:^|\s)(json|xml|csv|yaml)\.(\w*)$/);
			if (simplePkgMatch) {
				const pkgName = simplePkgMatch[1];
				const prefix = simplePkgMatch[2];
				const exports = getPackageExports(pkgName);
				if (exports) {
					return exports
						.filter(exp => !prefix || exp.toLowerCase().startsWith(prefix.toLowerCase()))
						.map(exp => ({
							label: exp,
							kind: CompletionItemKind.Field,
							detail: `${pkgName}.${exp}`,
							data: { type: 'export', name: exp, package: pkgName }
						}));
				}
			}

			// Default: show all completions
			const items: CompletionItem[] = [];

			// Add keywords
			KEYWORDS.forEach(keyword => {
				items.push({
					label: keyword,
					kind: CompletionItemKind.Keyword,
					data: { type: 'keyword', name: keyword }
				});
			});

			// Add built-in types
			TYPES.forEach(type => {
				items.push({
					label: type,
					kind: CompletionItemKind.TypeParameter,
					data: { type: 'type', name: type }
				});
			});

			// Add built-in functions
			BUILTIN_FUNCTIONS.forEach(fn => {
				items.push({
					label: fn.name,
					kind: CompletionItemKind.Function,
					detail: fn.detail,
					data: { type: 'builtin', name: fn.name }
				});
			});

			// Add std packages
			ALL_PACKAGE_NAMES.forEach(pkg => {
				items.push({
					label: pkg,
					kind: CompletionItemKind.Module,
					detail: STD_PACKAGES[pkg].description,
					data: { type: 'package', name: pkg }
				});
			});

			// Add symbols from current document
			const documentSymbols = symbolTable.get(uri);
			if (documentSymbols) {
				documentSymbols.forEach((symbol, name) => {
					let kind: CompletionItemKind = CompletionItemKind.Variable;
					if (symbol.kind === 'function') kind = CompletionItemKind.Function;
					else if (symbol.kind === 'class') kind = CompletionItemKind.Class;
					else if (symbol.kind === 'interface') kind = CompletionItemKind.Interface;

					items.push({
						label: name,
						kind: kind,
						data: { type: 'symbol', name: name }
					});
				});
			}

			return items;
		}
	);

	connection.onCompletionResolve(
		(item: CompletionItem): CompletionItem => {
			const data = item.data as { type: string; name: string; package?: string };
			if (!data) return item;

			switch (data.type) {
				case 'keyword':
					item.detail = 'ALang keyword';
					item.documentation = `ALang keyword: ${data.name}`;
					break;
				case 'type':
					item.detail = 'ALang built-in type';
					break;
				case 'package':
					const pkg = STD_PACKAGES[data.name];
					if (pkg) {
						item.detail = `${data.name} - ${pkg.description}`;
						item.documentation = `**${data.name}**\n\n${pkg.description}\n\n**Exports:**\n${pkg.exports.map(e => `- \`${e}\``).join('\n')}`;
					}
					break;
				case 'subpackage':
					item.detail = STD_PACKAGES[data.name]?.description || '';
					break;
				case 'export':
					item.detail = `Export from ${data.package}`;
					break;
				case 'builtin':
					break;
				case 'symbol':
					break;
			}
			return item;
		}
	);
}