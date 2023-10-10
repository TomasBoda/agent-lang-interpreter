import { InterpreterOutput } from "../interpreter/interpreter.types";
import { LexerOutput } from "../lexer/lexer.types";
import { NodeType, ParserError } from "../parser/parser.types";
import { RuntimeError, ValueType } from "../runtime/runtime.types";
import { Position } from "../symbolizer/symbolizer.types";

export class Error {

    static lexer(message: string, position?: Position): LexerOutput {
        const positionError = this.getPositionError(position);
        const errorMessage = `Lexer Error${positionError}: ${message}`;

        return { status: { code: 1, message: errorMessage } } as LexerOutput;
    }

    static parser(message: string, position?: Position): ParserError {
        const positionError = this.getPositionError(position);
        const errorMessage = `Parser Error${positionError}: ${message}`;

        return { type: NodeType.Error, message: errorMessage } as ParserError;
    }

    static runtime(message: string, position?: Position): RuntimeError {
        const positionError = this.getPositionError(position);
        const errorMessage = `Runtime Error${positionError}: ${message}`;

        return { type: ValueType.Error, message: errorMessage } as RuntimeError;
    }

    static interpreter(message: string, position?: Position): InterpreterOutput {
        return { status: { code: 1, message } } as InterpreterOutput;
    }

    private static getPositionError(position?: Position): string {
        return position ? ` (line ${position.line}, character ${position.character})` : '';
    }
}