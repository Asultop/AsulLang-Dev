/* --------------------------------------------------------------------------------------------
 * ALang Language Client
 * VSCode extension that activates the ALang language server
 * ------------------------------------------------------------------------------------------ */

import { workspace, ExtensionContext, window } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ErrorAction,
	CloseAction
} from 'vscode-languageclient/node';

import { resolveServerOptions } from './serverLocator';

let client: LanguageClient;

export async function activate(context: ExtensionContext) {
	const out = window.createOutputChannel('ALang Language Support');
	function log(msg: string) {
		const now = new Date();
		const timeStr = now.toISOString().replace('T', ' ').replace('Z', '');
		out.appendLine(`[${timeStr}] ${msg}`);
	}

	log('activate()');
	log(`platform=${process.platform} arch=${process.arch}`);
	log(`extensionPath=${context.extensionPath}`);
	out.show(true);

	const cfg = workspace.getConfiguration('alangLanguageServer');
	const configuredPath = cfg.get<string>('serverPath');
	const serverOptions = resolveServerOptions(context, configuredPath, log);

	const clientOptions: LanguageClientOptions = {
		documentSelector: [
			{ scheme: 'file', language: 'alang' },
			{ scheme: 'file', pattern: '**/*.alang' }
		],
		errorHandler: {
			error: (error) => {
				out.appendLine(`[client] connection error: ${String(error)}`);
				return { action: ErrorAction.Continue };
			},
			closed: () => {
				out.appendLine('[client] connection closed');
				return { action: CloseAction.DoNotRestart };
			}
		},
		synchronize: {
			fileEvents: workspace.createFileSystemWatcher('**/*.alang')
		}
	};

	client = new LanguageClient(
		'alangLanguageServer',
		'ALang Language Server',
		serverOptions,
		clientOptions
	);
	client.onDidChangeState((e) => {
		out.appendLine(`[client] state=${e.newState}`);
	});

	try {
		await client.start();
		out.appendLine('[client] client started successfully');
	} catch (e) {
		out.appendLine(`[client] client start failed: ${e}`);
	}
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
