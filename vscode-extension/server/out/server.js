"use strict";
/* --------------------------------------------------------------------------------------------
 * ALang Language Server
 * Entry point — wires up connection, documents, and feature handlers
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("vscode-languageserver/node");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const settings_1 = require("./settings");
const validation_1 = require("./validation");
const completion_1 = require("./completion");
const definition_1 = require("./definition");
const connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
const documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
let hasWorkspaceFolderCapability = false;
connection.onInitialize((params) => {
    const capabilities = params.capabilities;
    (0, settings_1.setHasConfigurationCapability)(!!(capabilities.workspace && !!capabilities.workspace.configuration));
    hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);
    const result = {
        capabilities: {
            textDocumentSync: node_1.TextDocumentSyncKind.Incremental,
            definitionProvider: true,
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: ['.', '@']
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
        connection.client.register(node_1.DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            connection.console.log('Workspace folder change event received.');
        });
    }
});
// Wire up features
const validate = (0, validation_1.createValidator)(connection, documents);
(0, settings_1.registerSettingsHandlers)(connection, documents, validate);
(0, completion_1.registerCompletionHandlers)(connection);
(0, definition_1.registerDefinitionHandler)(connection, documents);
documents.onDidChangeContent(change => {
    validate(change.document);
});
connection.onDidChangeWatchedFiles(_change => {
    connection.console.log('We received a file change event');
});
documents.listen(connection);
connection.listen();
//# sourceMappingURL=server.js.map