"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Error = void 0;
var process_1 = require("process");
var ErrorType;
(function (ErrorType) {
    ErrorType["LEX"] = "Lex Error";
    ErrorType["PARSE"] = "Parse Error";
    ErrorType["RUNTIME"] = "Runtime Error";
})(ErrorType || (ErrorType = {}));
var Error = /** @class */ (function () {
    function Error() {
    }
    Error.lex = function (position, message) {
        Error.raise(ErrorType.LEX, position, message);
    };
    Error.parse = function (position, message) {
        Error.raise(ErrorType.PARSE, position, message);
    };
    Error.runtime = function (position, message) {
        Error.raise(ErrorType.RUNTIME, position, message);
    };
    Error.raise = function (type, position, message) {
        if (position === null) {
            console.log("".concat(type, ": ").concat(message));
        }
        else {
            console.log("".concat(type, " (line ").concat(position.line, ", character ").concat(position.character, "): ").concat(message));
        }
        (0, process_1.exit)(0);
    };
    return Error;
}());
exports.Error = Error;
