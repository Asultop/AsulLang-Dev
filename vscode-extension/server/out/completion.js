"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCompletionHandlers = registerCompletionHandlers;
const node_1 = require("vscode-languageserver/node");
const symbols_1 = require("./symbols");
function registerCompletionHandlers(connection) {
    connection.onCompletion((_textDocumentPosition) => {
        const items = [];
        // Add keywords
        symbols_1.KEYWORDS.forEach(keyword => {
            items.push({
                label: keyword,
                kind: node_1.CompletionItemKind.Keyword,
                data: keyword
            });
        });
        // Add symbols from current document
        const documentSymbols = symbols_1.symbolTable.get(_textDocumentPosition.textDocument.uri);
        if (documentSymbols) {
            documentSymbols.forEach((symbol, name) => {
                let kind = node_1.CompletionItemKind.Variable;
                if (symbol.kind === 'function')
                    kind = node_1.CompletionItemKind.Function;
                else if (symbol.kind === 'class')
                    kind = node_1.CompletionItemKind.Class;
                else if (symbol.kind === 'interface')
                    kind = node_1.CompletionItemKind.Interface;
                items.push({
                    label: name,
                    kind: kind,
                    data: name
                });
            });
        }
        return items;
    });
    connection.onCompletionResolve((item) => {
        if (symbols_1.KEYWORDS.has(item.data)) {
            item.detail = 'ALang keyword';
            item.documentation = `ALang keyword: ${item.data}`;
        }
        return item;
    });
}
//# sourceMappingURL=completion.js.map