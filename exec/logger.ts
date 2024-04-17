
const colours = {
    done: "color: #2fba5d;",
    error: "color: red;",
    warn: "color: orange;",
    none: "color: white;"
};

export class Logger {

    static done(message: string): void {
        console.log("%cDone: %c" + message, colours.done, colours.none);
    }
    
    static error(message: string): void {
        console.log("%cError: %c" + message, colours.error, colours.none);
    }

    static warn(message: string): void {
        console.log("%cWarning: %c" + message, colours.warn, colours.none);
    }

    static info(message: string): void {
        console.log("Info: " + message);
    }
}