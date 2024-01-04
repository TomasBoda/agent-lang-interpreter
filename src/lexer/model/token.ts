import { Position } from "../../symbolizer";
import { TokenType } from "./token-type";

export interface Token {
    value: string;
    type: TokenType;
    position: Position;
}