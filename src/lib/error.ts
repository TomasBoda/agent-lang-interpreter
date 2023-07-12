import { exit } from "process";

enum ErrorType {
    BUILD = "Build Error",
    PARSE = "Parse Error",
    RUNTIME = "Runtime Error"
}

export class Error {

    static lex(message: string): void {
        Error.raise(ErrorType.BUILD, message);
    }

    static parse(message: string): void {
        Error.raise(ErrorType.PARSE, message);
    }

    static runtime(message: string): void {
        Error.raise(ErrorType.RUNTIME, message);
    }

    private static raise(type: ErrorType, message: string): void {
        console.log(`${type}: ${message}`);
        exit(0);
    }
}