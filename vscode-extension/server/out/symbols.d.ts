import { Location, TextDocument } from 'vscode-languageserver/node';
export declare const KEYWORDS: Set<string>;
export interface SymbolInfo {
    name: string;
    kind: 'function' | 'class' | 'variable' | 'interface';
    location: Location;
}
export declare const symbolTable: Map<string, Map<string, SymbolInfo>>;
export declare function extractSymbols(textDocument: TextDocument): Map<string, SymbolInfo>;
