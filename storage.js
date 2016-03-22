"use strict";

if(process.env.REDIS_URL) {
    var client = require('redis').createClient(process.env.REDIS_URL);
    var deasync = require('deasync');

    var getItem = deasync(client.get.bind(client));

    module.exports = {
        getItem: function(key) {
            return JSON.parse(getItem(key));
        },
        setItem: function(key, value) {
            client.set(key, JSON.stringify(value));
        }
    };
}
else {
    var localStorage = new require("node-localstorage").LocalStorage('./persist');

    module.exports = {
        getItem: function(key) {
            return JSON.parse(localStorage.getItem(key));
        },
        setItem: function(key, value) {
            localStorage.setItem(key, JSON.stringify(value));
        }
    };
}
