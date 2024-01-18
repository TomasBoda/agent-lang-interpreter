import { Position } from "../../symbolizer";

type ErrorType = "Lexer" | "Parser" | "Runtime";

export class ErrorModel extends Error {

    private type: ErrorType;
    private about: string;
    private position?: Position;

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
}