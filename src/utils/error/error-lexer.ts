import { ErrorModel } from "./error";
import { Position } from "../../symbolizer";

export class ErrorLexer extends ErrorModel {

    constructor(about: string, position?: Position) {
        super("Lexer", about, position);
    }
}