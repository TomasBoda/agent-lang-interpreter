import { Position } from "../../symbolizer/index.ts";
import { TokenType } from "./token-type.ts";

/**
 * Object representing a lexical token
 */
export interface Token {
    /** value of the token */
    value: string;
    /** type of the token */
    type: TokenType;
    /** position of the token in the source code */
    position: Position;
}