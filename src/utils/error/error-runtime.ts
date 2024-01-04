import { ErrorModel } from "./error";
import { Position } from "../../symbolizer";

export class ErrorRuntime extends ErrorModel {

    constructor(about: string, position?: Position) {
        super("Runtime", about, position);
    }
}