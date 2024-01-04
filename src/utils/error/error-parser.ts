import { ErrorModel } from "./error";
import { Position } from "../../symbolizer";

export class ErrorParser extends ErrorModel {

    constructor(about: string, position?: Position) {
        super("Parser", about, position);
    }
}