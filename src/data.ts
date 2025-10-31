import * as vscode from "vscode";

export type Bit = Record<string, number>
export type Fixtures = Record<string, Bit>

export const getBits = async (context: vscode.ExtensionContext, mapName: String): Promise<Fixtures> => {
    const fixtures: Fixtures = {}
    const mapPath = vscode.Uri.file(context.asAbsolutePath(`data/bitmaps/${mapName}.json`))
    
    const fs = vscode.workspace.fs
    const data = JSON.parse(new TextDecoder().decode(await fs.readFile(mapPath)))
    Object.keys(data).forEach(key => {
        const value: number = data[key]
        const split = key.split(".")
        const fixtureKey = split.at(0)
        const nameKey = split.at(1)
        if (fixtureKey == undefined || nameKey == undefined) {
            console.warn(`Skipping '${split}' (missing dot separator)`)
            return
        }
        
        let fixture: Bit = {}
        if (fixtureKey in fixtures) {
            fixture = fixtures[fixtureKey]
        } 
        fixture[nameKey] = value
        fixtures[fixtureKey] = fixture
    });
    return fixtures
}
