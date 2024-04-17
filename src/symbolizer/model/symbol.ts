import { Position } from "./position.ts";

/**
 * An object representing one symbol in the source code
 */
export interface Symbol {
    /** value of the symbol */
    value: string;
    /** position of the symbol in source code */
    position: Position;
}