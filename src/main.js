import config from "../config.json";
import Ticker from './ticker';

const debug = function (message) {
    if (config.debug) {
        console.log("[DEBUG] " + message);
    }
}

const tickers = new Map();

const load = async function () {
    debug("Starting application...")

    for (let name in config.tickers) {
        if (!config.tickers.hasOwnProperty(name)) continue;

        const obj = new Ticker(name, config);
        debug(`Registered ticker ${name}`);
        tickers.set(name, obj);

        debug("Scheduled ticker");
        await obj.schedule();
    }
}

load().then(() => {
    console.log("Started!")
});


export default {
    debug: debug,
    config: config,
}