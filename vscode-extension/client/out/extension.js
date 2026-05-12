"use strict";
/* --------------------------------------------------------------------------------------------
 * ALang Language Client
 * VSCode extension that activates the ALang language server
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode_1 = require("vscode");
const node_1 = require("vscode-languageclient/node");
const serverLocator_1 = require("./serverLocator");
let client;
async function activate(context) {
    const out = vscode_1.window.createOutputChannel('ALang Language Support');
    function log(msg) {
        const now = new Date();
        const timeStr = now.toISOString().replace('T', ' ').replace('Z', '');
        out.appendLine(`[${timeStr}] ${msg}`);
    }
    log('activate()');
    log(`platform=${process.platform} arch=${process.arch}`);
    log(`extensionPath=${context.extensionPath}`);
    out.show(true);
    const cfg = vscode_1.workspace.getConfiguration('alangLanguageServer');
    const configuredPath = cfg.get('serverPath');
    const serverOptions = (0, serverLocator_1.resolveServerOptions)(context, configuredPath, log);
    const clientOptions = {
        documentSelector: [
            { scheme: 'file', language: 'alang' },
            { scheme: 'file', pattern: '**/*.alang' }
        ],
        errorHandler: {
            error: (error) => {
                out.appendLine(`[client] connection error: ${String(error)}`);
                return { action: node_1.ErrorAction.Continue };
            },
            closed: () => {
                out.appendLine('[client] connection closed');
                return { action: node_1.CloseAction.DoNotRestart };
            }
        },
        synchronize: {
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/*.alang')
        }
    };
    client = new node_1.LanguageClient('alangLanguageServer', 'ALang Language Server', serverOptions, clientOptions);
    client.onDidChangeState((e) => {
        out.appendLine(`[client] state=${e.newState}`);
    });
    try {
        await client.start();
        out.appendLine('[client] client started successfully');
    }
    catch (e) {
        out.appendLine(`[client] client start failed: ${e}`);
    }
}
function deactivate() {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
//# sourceMappingURL=extension.js.map