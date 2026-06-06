import * as vscode from "vscode";
import { getSets } from "./utils";
import { drawerBitRegex, globalBitRegex, MappedFixtures, Mapping, recommendedMappings } from "./extension";

export const onDocumentUpdated = (document: vscode.TextDocument, diagCollection: vscode.DiagnosticCollection, mappedFixtures: MappedFixtures) => {
    const collected: vscode.Diagnostic[] = []
    
    // Checking "set fixtures" line
    const sets = getSets(
        document,
        mappedFixtures,
        {
            onMapError(line, mapKey) {
                const diag = new vscode.Diagnostic(
                    line.range,
                    `Invalid map '${mapKey}' (Example: ${recommendedMappings.join(", ")})`
                )
                collected.push(diag)
            },
            onFixtureError(line, mapKey, fixtureKey) {
                const fixtures = mappedFixtures[mapKey]
                const diag = new vscode.Diagnostic(
                    line.range,
                    `Invalid fixture '${fixtureKey}' (must be of: ${Object.keys(fixtures).join(", ")})`
                )
                collected.push(diag)
            }
        }
    )

    // Checking block maps
    for (let i = 0; i < document.lineCount; i++) {
        const docLine = document.lineAt(i)
        if (docLine.isEmptyOrWhitespace) continue
        const line = docLine.text.trim()
        const statements = line.split(",")
        statements.forEach(statement => {
            const split = statement.trim().split(" ")
            if (split.length < 2) return
            const mapKey = split[0]
            const bitName = split[1]

            if (sets == null) return
            if (mapKey != "any") {
                const fixture = sets[mapKey]
                if (fixture == null) return
                if (!(bitName in mappedFixtures[mapKey][fixture])) {
                    if (globalBitRegex.test(bitName)) return
                    if (drawerBitRegex.test(bitName)) {
                        // TODO: Test if drawered bits are correct
                        return
                    }
                    const diag = new vscode.Diagnostic(
                        docLine.range,
                        `Couldn't find the bit '${bitName}' in fixture '${fixture}'`
                    )
                    collected.push(diag)
                    return
                }
            } else {  // Any
                let err: vscode.Diagnostic | null = null
                Object.entries(sets).forEach(([mapKey, fixture]) => {
                    if (fixture == null) return
                    if (!(bitName in mappedFixtures[mapKey][fixture])) {
                        const diag = new vscode.Diagnostic(
                            docLine.range,
                            `The bit '${bitName}' is missing for the '${fixture}' fixture (${mapKey}).\nMake sure to specify which fixtures you support via \`set\`.`
                        )
                        err = diag
                        return
                    }
                })
                if (err != null) {
                    collected.push(err)
                }
            }
        })
    }
    
    if (collected.length != 0) {
        diagCollection.set(document.uri, collected)
    } else {
        diagCollection.clear()
    }
}
