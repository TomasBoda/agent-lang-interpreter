import { InterpreterOutput } from "../interpreter/interpreter.types";
import { LexerOutput } from "../lexer/lexer.types";
import { NodeType, ParserError } from "../parser/parser.types";
import { RuntimeError, ValueType } from "../runtime/runtime.types";

export class Error {

    static lexer(message: string): LexerOutput {
        return { status: { code: 1, message: `Lexer Error: ${message}` } } as LexerOutput;
    }

    static parser(message: string): ParserError {
        return { type: NodeType.Error, message: `Parser Error: ${message}` } as ParserError;
    }

    static runtime(message: string): RuntimeError {
        return { type: ValueType.Error, message: `Runtime Error: ${message}` } as RuntimeError;
    }

    static interpreter(message: string): InterpreterOutput {
        return { status: { code: 1, message } } as InterpreterOutput;
    }
}