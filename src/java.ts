import * as paths from "path";
import * as vscode from "vscode";
import { Nullable } from "./global";
import { execFile } from "child_process";
import { promisify } from "util";

const javaExeName = process.platform === "win32" ? "java.exe" : "java"

export interface JavaInfo {
    path: string;
    version: string;
    brand: Nullable<string>;
}

export abstract class Java {
    static readonly targetVersion = 21;
    static found: Nullable<JavaInfo> = null

    static get downloadUrl(): string {
        const url = new URL("https://adoptium.net/temurin/releases");
        url.searchParams.set("version", String(this.targetVersion));
        url.searchParams.set("os", process.platform === "win32" ? "windows" : "any");
        url.searchParams.set("arch", "any");
        return url.toString();
    }

    /** Hardest task known to man */
    static async search(): Promise<Nullable<JavaInfo>> {
        Java.found = null;
        for (const option of options()) {
            console.debug("Found potential Java path", option)
            const java = await Java.get(option);
            if (java) {
                Java.found = java;
                break;
            }
        }
        return Java.found;
    }

    static async get(executable: Nullable<string>): Promise<Nullable<JavaInfo>> {
        if (executable == null) return null
        try {
            const execFileAsync = promisify(execFile);
            const { stderr, stdout } = await execFileAsync(executable, ["-version"], {
                encoding: "utf8",
                windowsHide: true,
                timeout: 5000,
            });
            const text = stderr || stdout;
            const version = /version "([^"]+)"/.exec(text)?.[1];
            if (!version) return null;
            const brand = /^(\S+)\s+version/m.exec(text)?.[1] ?? null;
            return { path: executable, version, brand };
        } catch {
            return null;
        }
    }
}

function* options(): Generator<string> {
    const setting = vscode.workspace.getConfiguration("showbiz").get<string>("javaPath");
    if (setting && setting.length > 0) yield fixPath(setting);

    for (const home of [process.env.JAVA_HOME, process.env.JDK_HOME]) {
        if (home) yield fixPath(home)
    }

    yield javaExeName;
}

/** Makes sure the path is an executable */
function fixPath(path: string): string {
    const last = paths.basename(path);
    if (last === "bin")
        return paths.join(path, javaExeName)
    if (last !== javaExeName)
        return paths.join(path, "bin", javaExeName)
    return path;
}
