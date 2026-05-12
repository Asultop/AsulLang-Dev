import { ExtensionContext } from 'vscode';
import { ServerOptions } from 'vscode-languageclient/node';
export declare function isUsableNativeServer(serverPath: string): boolean;
export declare function resolveServerOptions(context: ExtensionContext, configuredPath: string | undefined, log: (msg: string) => void): ServerOptions;
