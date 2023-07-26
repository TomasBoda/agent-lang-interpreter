import { exit } from "process";
import { Position } from "../lexer/lexer.types";

enum ErrorType {
    LEX = "Lex Error",
    PARSE = "Parse Error",
    RUNTIME = "Runtime Error"
}

export class Error {

    static lex(position: Position, message: string): void {
        Error.raise(ErrorType.LEX, position, message);
    }

    static parse(position: Position, message: string): void {
        Error.raise(ErrorType.PARSE, position, message);
    }

    static runtime(position: Position, message: string): void {
        Error.raise(ErrorType.RUNTIME, position, message);
    }

    private static raise(type: ErrorType, position: Position, message: string): void {
        console.log(`${type} (line ${position.line}, character ${position.character}): ${message}`);
        exit(0);
    }
}