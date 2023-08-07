import { LexerValue } from "../lexer/lexer.types";
import { NodeType, ParserError } from "../parser/parser.types";
import { RuntimeError, ValueType } from "../runtime/runtime.types";

export class Error {

    static lexer(message: string): LexerValue {
        return { status: { code: 1, message } } as LexerValue;
    }

    static parser(message: string): ParserError {
        return { type: NodeType.Error, message } as ParserError;
    }

    static runtime(message: string): RuntimeError {
        return { type: ValueType.Error, message } as RuntimeError;
    }
}