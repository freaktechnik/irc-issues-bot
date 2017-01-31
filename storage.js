"use strict";

if(process.env.REDIS_URL) {
    const client = require('redis').createClient(process.env.REDIS_URL),
        deasync = require('deasync'),
        getItem = deasync(client.get.bind(client));

    module.exports = {
        getItem(key) {
            return JSON.parse(getItem(key));
        },
        setItem(key, value) {
            client.set(key, JSON.stringify(value));
        }
    };
}
else {
    const { LocalStorage } = require("node-localstorage"),
        localStorage = new LocalStorage('./persist');

    module.exports = {
        getItem(key) {
            return JSON.parse(localStorage.getItem(key));
        },
        setItem(key, value) {
            localStorage.setItem(key, JSON.stringify(value));
        }
    };
}
