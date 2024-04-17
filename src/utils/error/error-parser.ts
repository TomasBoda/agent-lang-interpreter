import { ErrorModel } from "./error.ts";
import { Position } from "../../symbolizer/index.ts";

export class ErrorParser extends ErrorModel {

    constructor(about: string, position?: Position) {
        super("Parser", about, position);
    }
}