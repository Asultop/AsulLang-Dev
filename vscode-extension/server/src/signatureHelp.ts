import {
	Connection,
	SignatureHelp,
	SignatureInformation,
	TextDocumentPositionParams,
	ParameterInformation,
	MarkupKind
} from 'vscode-languageserver/node';

// ALang built-in function signatures
const builtinSignatures: Record<string, { signature: string; documentation: string }> = {
	'print': {
		signature: 'print(...args: any): void',
		documentation: 'Prints values to stdout without a trailing newline'
	},
	'println': {
		signature: 'println(...args: any): void',
		documentation: 'Prints values to stdout with a trailing newline'
	},
	'len': {
		signature: 'len(obj: string | array | object): number',
		documentation: 'Returns the length of a string, array, or object'
	},
	'sleep': {
		signature: 'sleep(milliseconds: number): Promise<void>',
		documentation: 'Returns a Promise that resolves after the specified milliseconds'
	},
	'eval': {
		signature: 'eval(code: string): any',
		documentation: 'Executes ALang code from a string and returns the result'
	},
	'quote': {
		signature: 'quote(code: string): Token[]',
		documentation: 'Parses ALang code and returns an array of Token objects'
	},
	'push': {
		signature: 'push(array: array, ...items: any): number',
		documentation: 'Appends items to the end of an array and returns the new length'
	},
	'map': {
		signature: 'array.map(callback: function): array',
		documentation: 'Creates a new array with the results of calling a function on every element'
	},
	'filter': {
		signature: 'array.filter(callback: function): array',
		documentation: 'Creates a new array with elements that pass a test'
	},
	'reduce': {
		signature: 'array.reduce(callback: function, initialValue?: any): any',
		documentation: 'Applies a function against an accumulator to reduce the array to a single value'
	},
	'Promise': {
		signature: 'Promise executor: (resolve: function, reject: function) => void',
		documentation: 'Creates a new Promise. executor is called immediately with resolve and reject functions'
	}
};

export function registerSignatureHelpHandler(connection: Connection): void {
	connection.onSignatureHelp((params: TextDocumentPositionParams): SignatureHelp | null => {
		// For now, return signature help for built-in functions
		// This could be extended to handle user-defined functions
		return null;
	});
}

export function getSignatureHelp(name: string, argCount: number): SignatureHelp | null {
	const builtin = builtinSignatures[name];
	if (!builtin) {
		return null;
	}

	const sigInfo: SignatureInformation = {
		label: builtin.signature,
		documentation: {
			kind: MarkupKind.Markdown,
			value: builtin.documentation
		}
	};

	return {
		signatures: [sigInfo],
		activeSignature: 0,
		activeParameter: Math.min(argCount - 1, 0)
	};
}