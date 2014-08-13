var irc = require("irc");
var githubAPI = require("github");
var c = require("irc-colors");

var channel = "#nightingale";

// Github API setup

var github = new githubAPI({
    version: "3.0.0"
});

// IRC config
var client = new irc.Client("irc.mozilla.org",
                "ngalebot",
                {
                    "channels": [ channel ],
                    "floodProtection": true
                }
            );

// Github repo
var repo = "https://github.com/nightingale-media-player/nightingale-hacking/issues/";

function colorStatus(status) {
    if(status == "open") {
        return " ["+c.green(status)+"] ";
    }
    else {
        return " ["+c.red(status)+"] ";
    }
}

client.addListener("message"+channel, function(from, message) {
    var pattern = /#([1-9][0-9]*)/g;
    if(pattern.test(message)) {
        // reset the regexp pattern
        pattern.lastIndex = 0;
        var res;
        while((res = pattern.exec(message)) !== null) {
            github.issues.getRepoIssue({
                user: "nightingale-media-player",
                repo: "nightingale-hacking",
                number: res[1]
            },
            function(e, data) {
                var msg = "Issue "+ c.bold("#"+data.number)+": "+data.title+colorStatus(data.state)+data.html_url;
                client.say(channel, msg);
            });
        }
    }
});
