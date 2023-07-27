"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Environment = void 0;
var error_1 = require("../lib/error");
var Environment = /** @class */ (function () {
    function Environment(parent) {
        this.parent = parent;
        this.variables = new Map();
    }
    Environment.prototype.declareVariable = function (identifier, value) {
        var _a;
        if ((_a = this.variables) === null || _a === void 0 ? void 0 : _a.has(identifier)) {
            error_1.Error.runtime(null, "Cannot declare variable '".concat(identifier, "' as it has already been declared"));
            return {};
        }
        this.variables.set(identifier, value);
        return value;
    };
    Environment.prototype.assignVariable = function (identifier, value) {
        var env = this.resolve(identifier);
        env.variables.set(identifier, value);
        return value;
    };
    Environment.prototype.lookupVariable = function (identifier) {
        var env = this.resolve(identifier);
        return env.variables.get(identifier);
    };
    Environment.prototype.resolve = function (identifier) {
        if (this.variables.has(identifier)) {
            return this;
        }
        if (this.parent === undefined) {
            error_1.Error.parse(null, "Cannot resolve variable ".concat(identifier, " as it does not exist"));
            return {};
        }
        return this.parent.resolve(identifier);
    };
    return Environment;
}());
exports.Environment = Environment;
