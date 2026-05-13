/* --------------------------------------------------------------------------------------------
 * ALang Language Server
 * Entry point — wires up connection, documents, and feature handlers
 * ------------------------------------------------------------------------------------------ */

import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	TextDocumentSyncKind,
	InitializeResult
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { setHasConfigurationCapability, registerSettingsHandlers } from './settings';
import { createValidator } from './validation';
import { registerCompletionHandlers } from './completion';
import { registerDefinitionHandler } from './definition';
import { registerHoverHandler } from './hover';
import { registerDocumentSymbolHandler } from './documentSymbols';

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasWorkspaceFolderCapability = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	setHasConfigurationCapability(!!(capabilities.workspace && !!capabilities.workspace.configuration));
	hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			definitionProvider: true,
			hoverProvider: true,
			documentSymbolProvider: true,
			completionProvider: {
				resolveProvider: true,
				triggerCharacters: ['.', '@', '(']
			}
		}
	};

	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: { supported: true }
		};
	}

	return result;
});

connection.onInitialized(() => {
	if (connection.client.register) {
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// Wire up features
const validate = createValidator(connection, documents);
registerSettingsHandlers(connection, documents, validate);
registerCompletionHandlers(connection, documents);
registerDefinitionHandler(connection, documents);
registerHoverHandler(connection, documents);
registerDocumentSymbolHandler(connection, documents);

documents.onDidChangeContent(change => {
	validate(change.document);
});

connection.onDidChangeWatchedFiles(_change => {
	connection.console.log('We received a file change event');
});

documents.listen(connection);
connection.listen();
