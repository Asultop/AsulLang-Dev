"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.symbolTable = exports.KEYWORDS = void 0;
exports.extractSymbols = extractSymbols;
const node_1 = require("vscode-languageserver/node");
exports.KEYWORDS = new Set([
    'let', 'var', 'const', 'function', 'fn', 'return',
    'if', 'else', 'while', 'do', 'for', 'foreach', 'in',
    'break', 'continue', 'switch', 'case', 'default',
    'class', 'interface', 'extends', 'new', 'static',
    'async', 'await', 'go',
    'try', 'catch', 'finally', 'throw',
    'import', 'from', 'as', 'export',
    'match', 'yield', 'true', 'false', 'null'
]);
exports.symbolTable = new Map();
function extractSymbols(textDocument) {
    const text = textDocument.getText();
    const lines = text.split('\n');
    const documentSymbols = new Map();
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Function definitions
        const funcMatch = line.match(/\b(?:function|fn)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
        if (funcMatch) {
            const funcName = funcMatch[1];
            const index = line.indexOf(funcName);
            documentSymbols.set(funcName, {
                name: funcName,
                kind: 'function',
                location: node_1.Location.create(textDocument.uri, node_1.Range.create(i, index, i, index + funcName.length))
            });
        }
        // Class definitions
        const classMatch = line.match(/\bclass\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (classMatch) {
            const className = classMatch[1];
            const index = line.indexOf(className);
            documentSymbols.set(className, {
                name: className,
                kind: 'class',
                location: node_1.Location.create(textDocument.uri, node_1.Range.create(i, index, i, index + className.length))
            });
        }
        // Interface definitions
        const interfaceMatch = line.match(/\binterface\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (interfaceMatch) {
            const interfaceName = interfaceMatch[1];
            const index = line.indexOf(interfaceName);
            documentSymbols.set(interfaceName, {
                name: interfaceName,
                kind: 'interface',
                location: node_1.Location.create(textDocument.uri, node_1.Range.create(i, index, i, index + interfaceName.length))
            });
        }
        // Variable declarations
        const varMatch = line.match(/\b(let|var|const)\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
        if (varMatch) {
            const varName = varMatch[2];
            const index = line.indexOf(varName);
            documentSymbols.set(varName, {
                name: varName,
                kind: 'variable',
                location: node_1.Location.create(textDocument.uri, node_1.Range.create(i, index, i, index + varName.length))
            });
        }
    }
    return documentSymbols;
}
//# sourceMappingURL=symbols.js.map