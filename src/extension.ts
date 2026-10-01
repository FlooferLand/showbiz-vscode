import * as vscode from "vscode";
import * as paths from "path";
import { LanguageClient, LanguageClientOptions, ServerOptions } from "vscode-languageclient/node";
import { Nullable } from "./global";
import { Java } from "./java";

let client: Nullable<LanguageClient> = null;

export async function activate(ctx: vscode.ExtensionContext) {
    await testJava();

    const java = Java.found
    if (java) {
        const jarPath = ctx.asAbsolutePath(paths.join("data", "bin", "server.jar"));
        const serverOptions: ServerOptions = {
            run: { command: java.path, args: ["-jar", jarPath] },
            debug: { command: java.path, args: ["-jar", jarPath] }
        };
        const clientOptions: LanguageClientOptions = {
            documentSelector: [{ scheme: "file", language: "bitsmap" }]
        };

        client = new LanguageClient("showbiz", "Showbiz LSP", serverOptions, clientOptions);
        await client.start();
    }
}

export async function deactivate() {
    if (client != null) {
        await client.stop();
        client = null;
    }
}

/**Complains about Java if it's not found */
async function testJava() {
    const endBit = "You can also select a Java version in the settings"
    const downloadJava = `Download Java ${Java.targetVersion}`;
    const java = await Java.search();
    if (!java) {
        const message = "No Java was found. The Showbiz extension needs Java for it's language server. " + endBit;
        vscode.window.showErrorMessage(message, downloadJava).then(selection => {
            if (selection === downloadJava) {
                vscode.env.openExternal(vscode.Uri.parse(Java.downloadUrl));
            }
        });
        return;
    }

    if (!java.version.startsWith(Java.targetVersion.toString())) {
        const message = `Java ${java.version} was found, but Showbiz needs ${Java.targetVersion}. You may run into issues using '${java.path}'. ${endBit}`;
        vscode.window.showWarningMessage(message, downloadJava).then(selection => {
            if (selection === downloadJava) {
                vscode.env.openExternal(vscode.Uri.parse(Java.downloadUrl));
            }
        });
        return;
    }
}
