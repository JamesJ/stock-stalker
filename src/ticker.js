'use strict';
import Discord from 'discord.js';
import stock from './stock';

class Ticker {
    #config;
    #ticker;
    #id;
    #refreshRate;
    #connected = false;
    #client;
    #lastPresenceUpdate;

    constructor(id, config) {
        this.#id = id;
        this.#config = config;
        this.debug(`Initialising ticker ${id}`);
        this.#ticker = config.tickers[id];

        this.#refreshRate = this.#ticker.refresh_rate || config.refresh_rate;
        this.#client = new Discord.Client();
    }

    async connect() {
        this.login();

        const promise = new Promise((resolve, reject) => {
            this.#client.on('ready', () => {
                this.debug(`Logged in as ${this.#client.user.tag}!`);
                this.#lastPresenceUpdate = Date.now();

                this.debug("Setting client activity")
                this.#client.user.setActivity(this.#ticker.loading_message || this.#config.defaults.loading_message, {type: 'WATCHING'})
                    .then(value => resolve(value))
                    .catch(reason => reject(reason));
            });
        });

        await promise;
        this.debug("Connected!")
        this.#connected = true;
    }

    async start() {
        if (!this.#connected) {
            await this.connect();
        }
        const now = new Date().getMilliseconds();

        const instrument = this.#id;
        const pricing = await stock.getPrice(instrument, this.#ticker.crypto);

        if (pricing) {
            this.updateStatus(pricing);

            if (pricing.direction && pricing.direction !== "same") {
                if (pricing.text) {
                    await this.setNickname(pricing.text, pricing.direction, pricing.closed)
                }
            }
        }


        const finish = new Date().getMilliseconds();
        const time = finish - now;

        let delay = this.#refreshRate;
        if (time > this.#refreshRate) {
            delay = 50
        } else {
            // otherwise, we'll take a 1sec delay and minus the time
            // this is to ensure, in theory, it gets updated every minute
            // rather than 1 minute from the finish of the update
            delay -= time
        }
        await this.schedule(delay);
    }

    async schedule(delay) {
        setTimeout(() => {
            this.start();
        }, delay)
    }

    login() {
        this.debug("Logging in...")
        return this.#client.login(this.#ticker.token);
    }

    fetchPosition(guild) {
        if (this.#ticker.positions && this.#ticker.positions[guild.id]) {
            return this.#ticker.positions[guild.id];
        }
        return this.#ticker.position;
    }

    async setNickname(name, direction, closed) {
        const promises = [];

        this.#client.guilds.cache.forEach(guild => {
            let text = this.fetchPosition(guild) + "). " + name;
            const member = guild.members.resolve(this.#client.user.id);
            const promise = new Promise((resolve, reject) => {
                member.setNickname(text, "Market Move").then(() => {
                    this.refreshRoles(member, guild, direction !== "down" || closed, resolve, reject);
                }).catch(reason => reject(reason));
            });
            promises.push(promise);
        })

        await Promise.all(promises)
    }

    refreshRoles(member, guild, up, resolve, reject) {
        const role = this.#config.guilds[guild.id];
        if (up) {
            // going up
            this.debug(`Ticker ${this.#id} has gone up, so adding role ${role}`)
            member.roles.add(role).then(() => resolve()).catch(reason => reject(reason));
        } else {
            this.debug(`Ticker ${this.#id} has gone down, so removing role ${role}`)
            member.roles.remove(role).then(() => resolve()).catch(reason => reject(reason));
        }
    }

    updateStatus(obj) {
        if (!obj.percentage) {
            return;
        }
        const now = Date.now();
        if (this.#lastPresenceUpdate < (now - 4001) && !obj.soon) {
            let status;
            if (obj.halted) {
                status = "MARKET HALTED"
            } else if (obj.closed) {
                status = "the market sleep, you should too."
            } else {
                status = "$" + obj.name + " " + obj.market;
            }
            this.#client.user.setActivity(status, {type: 'WATCHING'});

            this.#lastPresenceUpdate = now
        }
    }

    debug(message) {
        if (this.#config.debug) {
            const date = new Date();
            console.log(`[${date.getHours()}:${date.getMinutes()}.${date.getMilliseconds()}] [DEBUG] [${this.#id}] ${message}`);
        }
    }
}

export default Ticker;