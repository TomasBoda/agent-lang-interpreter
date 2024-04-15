
interface TestAgent {
    identifier: string;
    count: string;
}

interface TestProperty {
    identifier: string;
    default?: string;
    value: string;
}

interface TestConst {
    identifier: string;
    value: string;
}

interface TestDefine {
    identifier: string;
    value: string;
}

export class TestCodeBuilder {

    private sourceCode: string = "";

    private _agent: TestAgent = { identifier: "entity", count: "10" };
    private _properties: TestProperty[] = [];
    private _consts: TestConst[] = [];
    private _defines: TestDefine[] = [];

    public agent(identifier: string, count: string): TestCodeBuilder {
        this._agent = { identifier, count };
        return this;
    }

    public property(identifier: string, value: string, defaultValue?: string): TestCodeBuilder {
        this._properties.push({ identifier, value, default: defaultValue });
        return this;
    }

    public const(identifier: string, value: string): TestCodeBuilder {
        this._consts.push({ identifier, value });
        return this;
    }

    public define(identifier: string, value: string): TestCodeBuilder {
        this._defines.push({ identifier, value });
        return this;
    }

    public build(): string {
        for (const declaration of this._defines) {
            this.sourceCode += `define ${declaration.identifier} = ${declaration.value};\n`;
        }

        this.sourceCode += "\n";

        this.sourceCode += `agent ${this._agent.identifier} ${this._agent.count} {\n`;

        for (const declaration of this._consts) {
            this.sourceCode += `    const ${declaration.identifier} = ${declaration.value};\n`;
        }

        this.sourceCode += "\n";

        for (const declaration of this._properties) {
            this.sourceCode += `    property ${declaration.identifier}`;

            if (declaration.default) {
                this.sourceCode += `: ${declaration.default}`;
            }

            this.sourceCode += ` = ${declaration.value};\n`;
        }

        this.sourceCode += "}";

        return this.sourceCode;
    }
}