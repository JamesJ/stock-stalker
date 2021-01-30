import axios from 'axios'

async function getPrice(instrument) {
    let obj = {};
    let res;
    try {
        res = await getSingleStockInfo(instrument);
    } catch (e) {
        console.log("Failed to fetch data " + e);
        return obj
    }

    obj = getCurrentPricingObject(res);
    return obj
}

let lastPrice;
async function getCurrentPricingObject(instrument) {
    const obj = {};
    obj.name = instrument.symbol;


    if (instrument.marketState === "PRE") {
        obj.price = instrument.preMarketPrice;
        obj.percentage = instrument.preMarketChangePercent
    } else if (instrument.marketState === "POST") {
        obj.price = instrument.postMarketPrice;
        obj.percentage = instrument.postMarketChangePercent
    } else if (instrument.marketState === "CLOSED") {
        obj.closed = true;
        obj.lastPrice = instrument.postMarketPrice
    } else {
        obj.price = instrument.regularMarketPrice;
        obj.percentage = instrument.regularMarketChangePercent;
        if (!instrument.tradeable && obj.price === lastPrice) {
            //obj.halted = true
        }
    }

    if (obj.price === undefined) {
        obj.soon = true;
        obj.text = "No data (yet)";
        return obj
    }


    if (obj.price === lastPrice) {
        obj.direction = "same"
    } else if (obj.price < lastPrice) {
        obj.direction = "down"
    } else if (obj.price > lastPrice) {
        obj.direction = "up"
    }
    obj.move = obj.price - lastPrice;
    lastPrice = obj.price;

    let text;

    if (obj.price == null) {
        text = "Failed to refresh";
    } else {
        if (obj.halted) {
            text = "$" + obj.price.toFixed(2)
        } else if (obj.closed) {
            text = "Close @ $" + obj.price.toFixed(2)
        } else {
            text = "$" + obj.price.toFixed(2);

            if (obj.closed) {
                text += " (Closed)"
            } else if (!isNaN(obj.move) && obj.move !== 0 && obj.move !== undefined) {
                text += " (" + (obj.move > 0 ? "+" : "") + obj.move.toFixed(2) + ")";
            }
        }
    }

    obj.text = text;

    obj.halted = await isHalted(instrument);
    return obj
}

const getSingleStockInfo = stock =>
    new Promise((resolve, reject) => {
        if (!stock) {
            return reject(Error('Stock symbol required'));
        }
        if (typeof stock !== 'string') {
            return reject(Error(`Invalid argument type. Required: string. Found: ${typeof stock}`));
        }

        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${stock}`;

        return axios
            .get(url)
            .then((res) => {
                const {data} = res;
                if (
                    !data ||
                    !data.quoteResponse ||
                    !data.quoteResponse.result ||
                    data.quoteResponse.result.length === 0
                ) {
                    return reject(new Error(`Error retrieving info for symbol ${stock}`));
                }
                return resolve(data.quoteResponse.result[0]);
            })
            .catch(err => reject(err));
    });

const isHalted = instrument => {
    return new Promise((resolve, reject) => {
        if (!stock) {
            return reject(Error('Stock symbol required'));
        }
        if (typeof stock !== 'string') {
            return reject(Error(`Invalid argument type. Required: string. Found: ${typeof stock}`));
        }

        const url = `https://api.iextrading.com/1.0/deep/trading-status?symbols=${stock}`;

        return axios
            .get(url)
            .then((res) => {
                const {data} = res;
                if (!data || !data[instrument]) {
                    return reject(new Error(`Error retrieving halt status for symbol ${stock}`));
                }
                return resolve(data[instrument].status === "H");
            })
            .catch(err => reject(err));
    });
};

export default {
    getPrice: getPrice
}
