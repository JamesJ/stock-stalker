const Discord = require('discord.js');
const client = new Discord.Client();

const roleMap = require('../guilds.json')

let lastPresenceUpdate
function getColor(guild) {
    return roleMap[guild]
}

client.on("warn", function (info) {
    console.log(`warn: ${info}`);
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    lastPresenceUpdate = Date.now()

    client.user.setActivity("stocks go brrr", {type: 'WATCHING'})
        .then(console.log)
        .catch(console.error);
});

function login(token) {
    return client.login(token);
}


async function changeName(obj, ordering) {
    const promises = []

    const now = Date.now()
    if (lastPresenceUpdate < (now - 4001) && !obj.soon) {
        let status
        if (obj.halted) {
            status = "MARKET HALTED"
        } else if (obj.closed) {
            status = "the market sleep, you should too."
        } else {
            status = "$" + obj.name + " go "
            if (obj.direction === "down") {
                status += "↘"
            } else {
                status += "↗"
            }

            status += "(" + obj.percentage.toFixed(2) + "%)"

        }
        promises.push(client.user.setActivity(status, {type: 'WATCHING'}));

        lastPresenceUpdate = now
    }

    console.log("Current state: " + JSON.stringify(obj))
    if (obj.direction !== "same") {
        let name = ordering + "). " + obj.text

        client.guilds.cache.forEach(guild => {
            const member = guild.members.resolve(client.user.id);
            const promise = new Promise((resolve, reject) => {
                member.setNickname(name, "Market Move").then(() => {
                    if (obj.direction === "down") {
                        member.roles.remove(getColor(guild.id)).then(() => resolve()).catch(reason => reject(reason));
                    } else {
                        // stocks go brrr
                        member.roles.add(getColor(guild.id)).then(() => resolve()).catch(reason => reject(reason));
                    }
                }).catch(reason => reject(reason));
            });
            promises.push(promise);
        })
    }

    await Promise.all(promises)
}

export default {
    login: login,
    changeName: changeName
}
