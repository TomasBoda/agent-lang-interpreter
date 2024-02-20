import { Position, Symbol } from "./model";

export class Symbolizer {

    private sourceCode: string;

    constructor(sourceCode: string) {
        this.sourceCode = sourceCode;
    }

    /**
     * Produces an array of symbols from source code
     * 
     * @returns array of symbols
     */
    public symbolize(): Symbol[] {
        const symbols: Symbol[] = [];
        const position: Position = {
            line: 1,
            character: 1
        };

        for (const character of this.sourceCode.split("")) {
            symbols.push({
                value: character,
                position: { ...position }
            });

            position.character++;

            if (character === "\n") {
                position.line++;
                position.character = 1;
            }
        }

        return symbols;
    }
}