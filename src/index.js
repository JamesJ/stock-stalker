import discord from './discord'
import stocks from './stock'

import yargs from 'yargs'

const argv = yargs
    .option('token', {
        alias: 't',
        description: 'The discord token',
        type: 'string',
    })
    .option('instrument', {
        alias: 'i',
        description: 'The instrument to use',
        type: 'string',
    })
    .option('position', {
        alias: 'p',
        description: 'The instrument position on discord',
        type: 'string',
    })
    .help()
    .alias('help', 'h')
    .argv;

function initDiscordConnection() {
    console.log("Starting...");

    discord.login(argv.token).then(() => {
        worker(argv.instrument, argv.position)
    })
}

initDiscordConnection();

function worker(instrument, position) {
    stocks.getPrice(instrument).then(value => {
        const now = new Date().getMilliseconds();
        if (value != null) {
            discord.changeName(value, position).then(() => {
                const finish = new Date().getMilliseconds();
                const time = finish - now;

                let delay = 1000;
                // if the process took >1sec, lets give discord some time to breath
                if (time > 1000) {
                    delay = 50
                } else {
                    // otherwise, we'll take a 1sec delay and minus the time
                    // this is to ensure, in theory, it gets updated every minute
                    // rather than 1 minute from the finish of the update
                    delay -= time
                }
                console.log("Took " + time + "ms to execute everything");
                schedule(delay, instrument, position)
            }).catch(reason => {
                console.log(reason);
                schedule(1000, instrument, position)
            })
        } else {
            schedule(1000, instrument, position)
        }
    })
}

function schedule(delay, instrument, position) {
    setTimeout(function () {
        worker(instrument, position)
    }, delay)
}
