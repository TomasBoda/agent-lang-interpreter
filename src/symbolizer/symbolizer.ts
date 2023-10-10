import { Position, Symbol } from "./symbolizer.types";

export class Symbolizer {

    private sourceCode: string;

    constructor(sourceCode: string) {
        this.sourceCode = sourceCode;
    }

    public symbolize(): Symbol[] {
        const position: Position = { line: 1, character: 1 };
        const symbols: Symbol[] = [];

        for (const character of this.sourceCode.split("")) {
            symbols.push({ value: character, position: { ...position } });

            position.character++;

            if (character === "\n") {
                position.line++;
                position.character = 1;
            }
        }

        return symbols;
    }
}