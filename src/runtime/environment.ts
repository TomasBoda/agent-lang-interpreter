import { RuntimeValue } from "./runtime.types";
import { Error } from "../utils/error";

export class Environment {

    private parent?: Environment;
    private variables: Map<string, RuntimeValue>;

    constructor(parent?: Environment) {
        this.parent = parent;
        this.variables = new Map();
    }

    public declareVariable(identifier: string, value: RuntimeValue): RuntimeValue {
        if (this.variables?.has(identifier)) {
            Error.runtime(null, `Cannot declare variable '${identifier}' as it has already been declared`);
            return {} as RuntimeValue;
        }

        this.variables.set(identifier, value);
        return value;
    }

    public assignVariable(identifier: string, value: RuntimeValue): RuntimeValue {
        const env = this.resolve(identifier);
        env.variables.set(identifier, value);
        return value;
    }

    public lookupVariable(identifier: string): RuntimeValue {
        const env = this.resolve(identifier);
        return env.variables.get(identifier) as RuntimeValue;
    }

    public resolve(identifier: string): Environment {
        if (this.variables.has(identifier)) {
            return this;
        }

        if (this.parent === undefined) {
            Error.parse(null, `Cannot resolve variable ${identifier} as it does not exist`);
            return {} as Environment;
        }

        return this.parent.resolve(identifier);
    }
}