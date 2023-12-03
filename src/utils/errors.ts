import { Position } from "../symbolizer/symbolizer.types";

type ErrorType = "Lexer" | "Parser" | "Runtime";

export class ErrorModel extends Error {

    private about: string;
    private position?: Position;
    private type: ErrorType;

    constructor(type: ErrorType, about: string, position?: Position) {
        super(about);

        this.type = type;
        this.about = about;
        this.position = position;
    }

    public toString(): string {
        if (!this.position) {
            return `${this.type} Error: ${this.about}`;
        }

        return `${this.type} Error (line ${this.position.line}, character ${this.position.character}): ${this.about}`;
    }

    public throw(): void {
        console.log(this.toString());
    }
}

export class ErrorLexer extends ErrorModel {

    constructor(about: string, position?: Position) {
        super("Lexer", about, position);
    }
}

export class ErrorParser extends ErrorModel {

    constructor(about: string, position?: Position) {
        super("Parser", about, position);
    }
}

export class ErrorRuntime extends ErrorModel {

    constructor(about: string, position?: Position) {
        super("Runtime", about, position);
    }
}