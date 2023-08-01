
export type ValueType = "number" | "boolean";

export interface RuntimeValue {
    type: ValueType;
}

export interface NumberValue extends RuntimeValue {
    type: "number";
    value: number;
}

export interface BooleanValue extends RuntimeValue {
    type: "boolean";
    value: boolean;
}

export interface RuntimeVariable {
    identifier: string;
    value: number | boolean;
}