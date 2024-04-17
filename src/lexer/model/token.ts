import { Position } from "../../symbolizer/index.ts";
import { TokenType } from "./token-type.ts";

export interface Token {
    value: string;
    type: TokenType;
    position: Position;
}