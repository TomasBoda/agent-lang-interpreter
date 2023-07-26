import { exit } from "process";
import { Position } from "../lexer/lexer.types";

enum ErrorType {
    LEX = "Lex Error",
    PARSE = "Parse Error",
    RUNTIME = "Runtime Error"
}

export class Error {

    static lex(position: Position | null, message: string): void {
        Error.raise(ErrorType.LEX, position, message);
    }

    static parse(position: Position | null, message: string): void {
        Error.raise(ErrorType.PARSE, position, message);
    }

    static runtime(position: Position | null, message: string): void {
        Error.raise(ErrorType.RUNTIME, position, message);
    }

    private static raise(type: ErrorType, position: Position | null, message: string): void {
        if (position === null) {
            console.log(`${type}: ${message}`);
        } else {
            console.log(`${type} (line ${position.line}, character ${position.character}): ${message}`);
        }

        exit(0);
    }
}