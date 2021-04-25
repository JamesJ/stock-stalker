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

        const self = this;
        const promise = new Promise((resolve, reject) => {
            this.#client.on('ready', () => {
                self.debug(`Logged in as ${this.#client.user.tag}!`);
                this.#lastPresenceUpdate = Date.now();

                self.debug("Setting client activity")
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

        this.updateStatus(pricing);

        if (pricing.direction !== "same") {
            await this.setNickname(pricing.text, pricing.direction, pricing.closed)
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
        const self = this;
        setTimeout(function () {
            self.start();
        }, delay)
    }

    login() {
        this.debug("Logging in...")
        return this.#client.login(this.#ticker.token);
    }

    async setNickname(name, direction, closed) {

        const promises = [];

        let text = this.#ticker.position + "). " + name;

        this.#client.guilds.cache.forEach(guild => {
            const member = guild.members.resolve(this.#client.user.id);
            const promise = new Promise((resolve, reject) => {
                member.setNickname(text, "Market Move").then(() => {
                    this.refreshRoles(member, guild, direction === "up" || closed, resolve, reject);
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
        const now = Date.now();
        if (this.#lastPresenceUpdate < (now - 4001) && !obj.soon) {
            let status;
            if (obj.halted) {
                status = "MARKET HALTED"
            } else if (obj.closed) {
                status = "the market sleep, you should too."
            } else {
                status = "$" + obj.name + " go ";
                if (obj.direction === "down") {
                    status += "↘"
                } else {
                    status += "↗"
                }

                status += "(" + obj.percentage.toFixed(2) + "%)"

            }
            this.#client.user.setActivity(status, {type: 'WATCHING'});

            this.#lastPresenceUpdate = now
        }
    }

    debug(message) {
        if (this.#config.debug) {
            console.log("[DEBUG] [" + this.#id + "] " + message);
        }
    }
}

export default Ticker;