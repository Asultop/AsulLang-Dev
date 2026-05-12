import { Connection, TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
export declare function registerDefinitionHandler(connection: Connection, documents: TextDocuments<TextDocument>): void;
