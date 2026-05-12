import * as path from 'path';
import * as fs from 'fs';
import { ExtensionContext } from 'vscode';
import { ServerOptions, TransportKind } from 'vscode-languageclient/node';

export function isUsableNativeServer(serverPath: string): boolean {
	try {
		if (!fs.existsSync(serverPath)) return false;
		if (process.platform === 'darwin') {
			const buf = fs.readFileSync(serverPath);
			if (buf.length < 8) return false;
			const magicLE = buf.readUInt32LE(0);
			if (magicLE === 0xfeedfacf && buf.length >= 12) {
				const cputype = buf.readInt32LE(4);
				// FAT/universal binaries or unknown formats: assume usable
			}
		}
		return true;
	} catch {
		return false;
	}
}

export function resolveServerOptions(
	context: ExtensionContext,
	configuredPath: string | undefined,
	log: (msg: string) => void
): ServerOptions {
	const bundledServer = context.asAbsolutePath(
		path.join('bin', process.platform === 'win32' ? 'alang-lsp.exe' : 'alang-lsp')
	);
	log(`configured serverPath=${configuredPath ?? ''}`);
	log(`bundled server path=${bundledServer}`);

	const serverCommand = (configuredPath && configuredPath.trim().length > 0)
		? configuredPath
		: (isUsableNativeServer(bundledServer) ? bundledServer : undefined);
	log(`selected server=${serverCommand ?? '(node fallback)'} `);

	if (serverCommand) {
		return {
			run: { command: serverCommand, transport: TransportKind.stdio },
			debug: { command: serverCommand, transport: TransportKind.stdio }
		};
	}

	// Fallback to the Node.js implementation if the native binary isn't present.
	const serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
	return {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};
}
