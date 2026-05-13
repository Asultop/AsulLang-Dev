// ALang standard library packages and their exports
export const STD_PACKAGES: Record<string, { description: string; exports: string[] }> = {
	'std': {
		description: 'Root standard library namespace',
		exports: ['std.io', 'std.math', 'std.string', 'std.time', 'std.os', 'std.regex', 'std.encoding', 'std.network', 'std.crypto', 'std.collections', 'std.array', 'std.log', 'std.test', 'std.ffi', 'std.uuid', 'std.events']
	},
	'std.io': {
		description: 'File I/O operations',
		exports: ['File', 'Dir', 'Stream', 'stdin', 'stdout', 'stderr', 'readFile', 'writeFile', 'appendFile', 'mkdir', 'rmdir', 'stat', 'copy', 'move', 'chmod', 'walk']
	},
	'std.math': {
		description: 'Mathematical functions and constants',
		exports: ['pi', 'e', 'abs', 'sin', 'cos', 'tan', 'sqrt', 'exp', 'log', 'pow', 'ceil', 'floor', 'round', 'min', 'max', 'random', 'clamp', 'lerp', 'approxEqual']
	},
	'std.string': {
		description: 'String manipulation',
		exports: ['toUpperCase', 'toLowerCase', 'trim', 'replaceAll', 'repeat', 'localeCompare', 'split', 'substring', 'indexOf', 'lastIndexOf', 'startsWith', 'endsWith', 'charAt', 'charCodeAt']
	},
	'std.time': {
		description: 'Date and time operations',
		exports: ['Date', 'Duration', 'now', 'nowEpochMillis', 'nowEpochSeconds', 'nowISO', 'dateFromEpoch', 'parse']
	},
	'std.os': {
		description: 'Operating system operations',
		exports: ['system', 'getenv', 'setenv', 'getEnv', 'setEnv', 'signal', 'kill', 'raise', 'getpid', 'popen', 'platform', 'call', 'exit', 'arch']
	},
	'std.regex': {
		description: 'Regular expressions',
		exports: ['Regex']
	},
	'std.encoding': {
		description: 'Encoding/decoding utilities',
		exports: ['base64Encode', 'base64Decode', 'base64UrlEncode', 'base64UrlDecode', 'hexEncode', 'hexDecode', 'urlEncode', 'urlDecode']
	},
	'std.network': {
		description: 'Network operations',
		exports: ['fetch', 'get', 'post', 'put', 'delete', 'patch', 'head', 'request', 'http', 'Socket', 'URL', 'parseHeaders']
	},
	'std.crypto': {
		description: 'Cryptographic operations',
		exports: ['randomUUID', 'getRandomValues', 'md5', 'sha1', 'sha256', 'aes', 'encrypt', 'decrypt']
	},
	'std.collections': {
		description: 'Collection data structures',
		exports: ['map', 'set', 'deque', 'stack', 'queue', 'priorityQueue', 'keysSorted']
	},
	'std.array': {
		description: 'Array utility methods',
		exports: ['flat', 'flatMap', 'unique', 'chunk', 'groupBy', 'zip', 'diff']
	},
	'std.log': {
		description: 'Logging utilities',
		exports: ['debug', 'info', 'warn', 'error', 'json', 'setLevel', 'getLevel', 'setColors']
	},
	'std.test': {
		description: 'Testing framework',
		exports: ['assert', 'assertEqual', 'assertNotEqual', 'getStats', 'resetStats', 'pass', 'fail', 'printSummary']
	},
	'std.ffi': {
		description: 'Foreign function interface',
		exports: ['dlopen', 'dlsym', 'dlclose', 'call', 'RTLD_LAZY', 'RTLD_NOW', 'RTLD_GLOBAL', 'RTLD_LOCAL']
	},
	'std.uuid': {
		description: 'UUID generation',
		exports: ['v4']
	},
	'std.events': {
		description: 'Event system',
		exports: ['connect', 'AsulObject']
	},
	'json': {
		description: 'JSON parsing and serialization',
		exports: ['parse', 'stringify']
	},
	'xml': {
		description: 'XML parsing',
		exports: ['parse']
	},
	'csv': {
		description: 'CSV parsing and serialization',
		exports: ['parse', 'stringify', 'read', 'write']
	},
	'yaml': {
		description: 'YAML parsing',
		exports: ['parse']
	}
};

export function getStdPackageCompletion(prefix: string): string[] {
	const prefixLower = prefix.toLowerCase();
	return Object.keys(STD_PACKAGES).filter(pkg =>
		pkg.toLowerCase().startsWith(prefixLower) ||
		pkg.toLowerCase().includes(prefixLower)
	);
}

export function getPackageExports(pkgName: string): string[] | undefined {
	return STD_PACKAGES[pkgName]?.exports;
}

export const ALL_PACKAGE_NAMES = Object.keys(STD_PACKAGES);