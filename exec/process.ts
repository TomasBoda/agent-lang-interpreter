import { Logger } from "./logger.ts";
import { exit as processExit } from "node:process";

export class Process {

    static exit(code: number): void {
        switch (code) {
            case 0: {
                Logger.done(`Finished with exit code ${code}`);
                break;
            }
            default: {
                Logger.error(`Finished with exit code ${code}`);
                break;
            }
        }

        processExit(code);
    }
}