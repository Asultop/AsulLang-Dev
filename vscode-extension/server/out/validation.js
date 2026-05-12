"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createValidator = createValidator;
const node_1 = require("vscode-languageserver/node");
const settings_1 = require("./settings");
const symbols_1 = require("./symbols");
function createValidator(connection, documents) {
    return async function validateTextDocument(textDocument) {
        const settings = await (0, settings_1.getDocumentSettings)(textDocument.uri, connection);
        const text = textDocument.getText();
        const diagnostics = [];
        // Extract symbols
        const documentSymbols = (0, symbols_1.extractSymbols)(textDocument);
        symbols_1.symbolTable.set(textDocument.uri, documentSymbols);
        // Basic syntax checking
        const lines = text.split('\n');
        for (let i = 0; i < lines.length && diagnostics.length < settings.maxNumberOfProblems; i++) {
            const line = lines[i];
            // Check for unclosed double quotes
            const doubleQuotes = (line.match(/(?<!\\)"/g) || []).length;
            if (doubleQuotes % 2 !== 0 && !line.trim().startsWith('//') && !line.trim().startsWith('#')) {
                diagnostics.push({
                    severity: node_1.DiagnosticSeverity.Error,
                    range: {
                        start: { line: i, character: 0 },
                        end: { line: i, character: line.length }
                    },
                    message: `Unclosed double quote`,
                    source: 'alang'
                });
            }
            // Check for unclosed single quotes
            const singleQuotes = (line.match(/(?<!\\)'/g) || []).length;
            if (singleQuotes % 2 !== 0 && !line.trim().startsWith('//') && !line.trim().startsWith('#')) {
                diagnostics.push({
                    severity: node_1.DiagnosticSeverity.Error,
                    range: {
                        start: { line: i, character: 0 },
                        end: { line: i, character: line.length }
                    },
                    message: `Unclosed single quote`,
                    source: 'alang'
                });
            }
        }
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    };
}
//# sourceMappingURL=validation.js.map