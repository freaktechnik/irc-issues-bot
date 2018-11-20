"use strict";

if(process.env.REDIS_URL) {
    const client = require('redis').createClient(process.env.REDIS_URL);

    module.exports = {
        getItem(key) {
            return new Promise((resolve, reject) => client.get(key, (err, res) => {
                if(err) {
                    reject(err);
                }
                else {
                    try {
                        resolve(JSON.parse(res));
                    }
                    catch(e) {
                        reject(e);
                    }
                }
            }));
        },
        setItem(key, value) {
            return new Promise((resolve, reject) => client.set(key, JSON.stringify(value), (err) => {
                if(err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            }));
        }
    };
}
else {
    const { LocalStorage } = require("node-localstorage"),
        localStorage = new LocalStorage('./persist');

    module.exports = {
        getItem(key) {
            try {
                return Promise.resolve(JSON.parse(localStorage.getItem(key)));
            }
            catch(e) {
                return Promise.reject(e);
            }
        },
        setItem(key, value) {
            localStorage.setItem(key, JSON.stringify(value));
            return Promise.resolve();
        }
    };
}
