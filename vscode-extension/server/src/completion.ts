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

export function registerCompletionHandlers(connection: Connection, documents: TextDocuments<TextDocument>): void {
	connection.onCompletion(
		(params: TextDocumentPositionParams): CompletionItem[] => {
			const items: CompletionItem[] = [];
			const uri = params.textDocument.uri;
			const document = documents.get(uri);
			if (!document) return items;

			const text = document.getText();
			const lines = text.split('\n');
			const line = lines[params.position.line];
			const linePrefix = line.substring(0, params.position.character);

			// Context: std. or std.something. - provide package member completions
			const stdMatch = linePrefix.match(/std\.(\w*)/);
			if (stdMatch) {
				const prefix = stdMatch[1];
				Object.keys(STD_PACKAGES).filter(pkg =>
					pkg.startsWith('std.') && pkg.toLowerCase().includes(prefix.toLowerCase())
				).forEach(pkg => {
					items.push({
						label: pkg,
						kind: CompletionItemKind.Module,
						detail: STD_PACKAGES[pkg].description,
						data: { type: 'package', name: pkg }
					});
				});
				if (items.length > 0) return items;
			}

			// Context: import std.something. or import std - provide package completions
			const importMatch = linePrefix.match(/import\s+(std\.?\w*)/);
			if (importMatch) {
				const prefix = importMatch[1];
				ALL_PACKAGE_NAMES.filter(pkg => pkg.includes(prefix)).forEach(pkg => {
					items.push({
						label: pkg,
						kind: CompletionItemKind.Module,
						detail: STD_PACKAGES[pkg].description,
						data: { type: 'package', name: pkg }
					});
				});
				if (items.length > 0) return items;
			}

			// Context: from std.something import - provide export completions
			const fromImportMatch = linePrefix.match(/from\s+(std\.\w*)\s+import\s+(\w*)/);
			if (fromImportMatch) {
				const pkgName = fromImportMatch[1];
				const prefix = fromImportMatch[2];
				const exports = getPackageExports(pkgName);
				if (exports) {
					exports.filter(exp => exp.toLowerCase().includes(prefix.toLowerCase())).forEach(exp => {
						items.push({
							label: exp,
							kind: CompletionItemKind.Field,
							detail: `Export from ${pkgName}`,
							data: { type: 'export', name: exp, package: pkgName }
						});
					});
				}
				if (items.length > 0) return items;
			}

			// Context: std.something. - provide sub-package or export completions
			const subPkgMatch = linePrefix.match(/std\.\w+\.(\w*)/);
			if (subPkgMatch) {
				const prefix = subPkgMatch[1];
				// Check if it's a known package
				const baseMatch = linePrefix.match(/(std\.\w+)\./);
				if (baseMatch) {
					const basePkg = baseMatch[1];
					const exports = getPackageExports(basePkg);
					if (exports) {
						exports.filter(exp => exp.toLowerCase().startsWith(prefix.toLowerCase())).forEach(exp => {
							items.push({
								label: exp,
								kind: CompletionItemKind.Field,
								detail: `Member of ${basePkg}`,
								data: { type: 'export', name: exp, package: basePkg }
							});
						});
					}
				}
				if (items.length > 0) return items;
			}

			// Default: provide all completions
			// Add std package names
			ALL_PACKAGE_NAMES.forEach(pkg => {
				items.push({
					label: pkg,
					kind: CompletionItemKind.Module,
					detail: STD_PACKAGES[pkg].description,
					data: { type: 'package', name: pkg }
				});
			});

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