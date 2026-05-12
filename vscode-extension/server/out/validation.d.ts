import { Connection, TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
export declare function createValidator(connection: Connection, documents: TextDocuments<TextDocument>): (textDocument: TextDocument) => Promise<void>;
