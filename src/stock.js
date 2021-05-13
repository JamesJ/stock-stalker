import axios from 'axios'

async function getPrice(instrument, crypto) {
    let obj = {};
    let res;
    try {
        res = await getSingleStockInfo(instrument);
    } catch (e) {
        console.log("Failed to fetch data " + e);
        return obj
    }

    obj = getCurrentPricingObject(res, crypto);
    return obj
}

let lastPrices = {};

async function getCurrentPricingObject(instrument, crypto) {
    const obj = {};
    obj.name = instrument.symbol;

    if (instrument.marketState === "PRE") {
        obj.market = "pre";
        obj.price = instrument.preMarketPrice;
    } else if (instrument.marketState === "POST") {
        obj.market = "post";
        obj.price = instrument.postMarketPrice;
    } else if (instrument.marketState === "CLOSED") {
        obj.closed = true;
        obj.price = instrument.postMarketPrice;
        obj.market = "closed";
    } else {
        obj.trading = true
        obj.price = instrument.regularMarketPrice;
        obj.market = ""
    }

    if (obj.price === undefined) {
        if (lastPrices[obj.name]) {
            obj.price = lastPrices[obj.name];
        } else {
            obj.price = instrument.regularMarketPrice;
        }
    }


    if (lastPrices[obj.name]) {
        if (obj.price === lastPrices[obj.name]) {
            obj.direction = "same"
        } else if (obj.price < lastPrices[obj.name]) {
            obj.direction = "down"
        } else if (obj.price > lastPrices[obj.name]) {
            obj.direction = "up"
        }
        obj.move = obj.price - lastPrices[obj.name];
    }
    lastPrices[obj.name] = obj.price;

    let text;

    if (obj.halted || obj.closed) {
        text = "$" + obj.price.toFixed(2)
    } else {
        text = "$" + obj.price.toFixed(2);
        if (obj.move && !isNaN(obj.move) && obj.move !== 0) {
            text += " (" + (obj.move > 0 ? "+" : "") + obj.move.toFixed(2) + ")";
        }
        
    }

    obj.text = text;

    // no point checking if the symbol is halted, if the market is closed
    if (!obj.closed && !crypto) {
        // disabled 12/5/21
        //obj.halted = await isHalted(instrument.symbol);
    }
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

const isHalted = stock => {
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
                if (!data || !data[stock]) {
                    return reject(new Error(`Error retrieving halt status for symbol ${stock}`));
                }
                return resolve(data[stock].status === "H");
            })
            .catch(err => reject(err));
    });
};

export default {
    getPrice: getPrice
}
