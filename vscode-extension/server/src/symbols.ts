import { Location, Range, TextDocument } from 'vscode-languageserver/node';

export const KEYWORDS = new Set([
	'let', 'var', 'const', 'function', 'fn', 'return',
	'if', 'else', 'while', 'do', 'for', 'foreach', 'in',
	'break', 'continue', 'switch', 'case', 'default',
	'class', 'interface', 'extends', 'new', 'static',
	'async', 'await', 'go',
	'try', 'catch', 'finally', 'throw',
	'import', 'from', 'as', 'export',
	'match', 'yield', 'true', 'false', 'null'
]);

export interface SymbolInfo {
	name: string;
	kind: 'function' | 'class' | 'variable' | 'interface';
	location: Location;
}

export const symbolTable: Map<string, Map<string, SymbolInfo>> = new Map();

export function extractSymbols(textDocument: TextDocument): Map<string, SymbolInfo> {
	const text = textDocument.getText();
	const lines = text.split('\n');
	const documentSymbols: Map<string, SymbolInfo> = new Map();

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Function definitions
		const funcMatch = line.match(/\b(?:function|fn)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
		if (funcMatch) {
			const funcName = funcMatch[1];
			const index = line.indexOf(funcName);
			documentSymbols.set(funcName, {
				name: funcName,
				kind: 'function',
				location: Location.create(
					textDocument.uri,
					Range.create(i, index, i, index + funcName.length)
				)
			});
		}

		// Class definitions
		const classMatch = line.match(/\bclass\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
		if (classMatch) {
			const className = classMatch[1];
			const index = line.indexOf(className);
			documentSymbols.set(className, {
				name: className,
				kind: 'class',
				location: Location.create(
					textDocument.uri,
					Range.create(i, index, i, index + className.length)
				)
			});
		}

		// Interface definitions
		const interfaceMatch = line.match(/\binterface\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
		if (interfaceMatch) {
			const interfaceName = interfaceMatch[1];
			const index = line.indexOf(interfaceName);
			documentSymbols.set(interfaceName, {
				name: interfaceName,
				kind: 'interface',
				location: Location.create(
					textDocument.uri,
					Range.create(i, index, i, index + interfaceName.length)
				)
			});
		}

		// Variable declarations
		const varMatch = line.match(/\b(let|var|const)\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
		if (varMatch) {
			const varName = varMatch[2];
			const index = line.indexOf(varName);
			documentSymbols.set(varName, {
				name: varName,
				kind: 'variable',
				location: Location.create(
					textDocument.uri,
					Range.create(i, index, i, index + varName.length)
				)
			});
		}
	}

	return documentSymbols;
}
