import { Position } from "../../symbolizer/index.ts";

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

    /**
     * Converts the error to a string representation suitable for presenting to the user
     * 
     * @returns string representation of the error
     */
    public toString(): string {
        if (!this.position) {
            return `${this.type} Error: ${this.about}`;
        }

        return `${this.type} Error (line ${this.position.line}, character ${this.position.character}): ${this.about}`;
    }
}