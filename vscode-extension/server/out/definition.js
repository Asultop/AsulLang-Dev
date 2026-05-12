"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDefinitionHandler = registerDefinitionHandler;
const symbols_1 = require("./symbols");
function registerDefinitionHandler(connection, documents) {
    connection.onDefinition((params) => {
        const document = documents.get(params.textDocument.uri);
        if (!document) {
            return null;
        }
        const text = document.getText();
        const lines = text.split('\n');
        const line = lines[params.position.line];
        // Get the word at the cursor position
        const wordMatch = line.substring(0, params.position.character).match(/[a-zA-Z_][a-zA-Z0-9_]*$/);
        if (!wordMatch) {
            return null;
        }
        const word = wordMatch[0];
        // Look up in symbol table
        const documentSymbols = symbols_1.symbolTable.get(params.textDocument.uri);
        if (documentSymbols && documentSymbols.has(word)) {
            const symbol = documentSymbols.get(word);
            return symbol.location;
        }
        return null;
    });
}
//# sourceMappingURL=definition.js.map