import { ErrorModel } from "./error.ts";
import { Position } from "../../symbolizer/index.ts";

export class ErrorLexer extends ErrorModel {

    constructor(about: string, position?: Position) {
        super("Lexer", about, position);
    }
}