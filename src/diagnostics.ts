import * as vscode from "vscode";
import { getSets } from "./utils";
import { MappedFixtures, Mapping, recommendedMappings } from "./extension";

export const onDocumentUpdated = (document: vscode.TextDocument, diagCollection: vscode.DiagnosticCollection, bits: MappedFixtures) => {
    const collected: vscode.Diagnostic[] = []
    
    // Checking "set fixtures" line
    const fixtures = getSets(
        document,
        bits,
        {
            onMapError(line, mapKey) {
                const diag = new vscode.Diagnostic(
                    line.range,
                    `Invalid map '${mapKey}' (Example: ${recommendedMappings.join(", ")})`
                )
                collected.push(diag)
            },
            onFixtureError(line, mapKey, fixtureKey) {
                const fixtures = bits[mapKey as Mapping]
                const diag = new vscode.Diagnostic(
                    line.range,
                    `Invalid fixture '${fixtureKey}' (must be of: ${Object.keys(fixtures).join(", ")})`
                )
                collected.push(diag)
            }
        }
    )
    
    if (collected.length != 0) {
        diagCollection.set(document.uri, collected)
    } else {
        diagCollection.clear()
    }
}
