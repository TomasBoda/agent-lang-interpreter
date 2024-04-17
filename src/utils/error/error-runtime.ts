import { ErrorModel } from "./error.ts";
import { Position } from "../../symbolizer/index.ts";

export class ErrorRuntime extends ErrorModel {

    constructor(about: string, position?: Position) {
        super("Runtime", about, position);
    }
}