var irc = require("irc");
var githubAPI = require("github");
var c = require("irc-colors");
var localStorage = new require("node-localstorage").LocalStorage('./persist');

var storage = {
    getItem: function(key) {
        return JSON.parse(localStorage.getItem(key));
    },
    setItem: function(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }
};

// Github API setup

var github = new githubAPI({
    version: "3.0.0"
});

IssuesBot.prototype.owner = "nightingale-media-player";
IssuesBot.prototype.repo = "nightingale-hacking";
IssuesBot.prototype.client = null;
IssuesBot.prototype.ignoredUsers = [];
IssuesBot.prototype.channel = "#nightingale";
function IssuesBot(client, channel, repo) {
    if(!storage.getItem("ignore")) {
        storage.setItem("ignore", {});
    }

    var ignores = storage.getItem("ignore");
    if(!ignores[channel]) {
        ignores[channel] = [];
        storage.setItem("ignore", ignores);
    }

    this.ignoredUsers = ignores[channel];

	if(!client)
		throw new Error("Must pass a client argument to the constructor.");
	else if(!(client instanceof irc.Client)) {

		this.client = new irc.Client(client.server,
                client.name,
                {
                    "channels": client.channel,
                    "floodProtection": true
                }
            );
	}
	else {
		this.client = client;
	}
	if(repo) {
		var details = repo.split("/");
		this.owner = details[0];
		this.repo = details[1];
	}

    this.channel = channel

	var that = this,
        getIssue = function(owner, repo, number) {
            console.log(owner, repo, number);
            github.issues.getRepoIssue({
                user: owner,
                repo: repo,
                number: number
            },
            function(e, data) {
                console.log(e);
                if(!e) {
                    var msg = (owner != that.owner || repo != that.repo?c.grey(owner+"/"+repo+" "):"")
                                + (data.pull_request&&data.pull_request.url!=null?"Pull ":"Issue ")
                                + c.bold("#"+data.number)
                                + ": "
                                + data.title
                                + _colorStatus(data.state)
                                + _additionalInfo(data)
                                + data.html_url;
                    that.client.say(that.channel, msg);
                }
            });
        };
    this.listener = function(from, message) {
        if(that.ignoredUsers.indexOf(from) == -1) {
	        var pattern = /([a-zA-Z0-9\-]+\/[^#]+)?#([1-9][0-9]*)/g,
                issueLinkPattern = /https?:\/\/(www\.)?github\.com\/([^\/]+)\/([^\/]+)\/(issues|pull)\/([1-9][0-9]*)/;
	        if(pattern.test(message)) {
	            // reset the regexp pattern
	            pattern.lastIndex = 0;
	            var res, owner, repo;
	            while((res = pattern.exec(message)) !== null) {
	                console.log(res);
	                if(res[1] !== undefined) {
	                    owner = res[1].split("/")[0];
	                    repo = res[1].split("/")[1];
	                }
	                else {
	                    owner = that.owner;
	                    repo = that.repo;
                    }
	                getIssue(owner, repo, res[2]);
	            }
	        }
            else if(issueLinkPattern.test(message)) {
                var res = issueLinkPattern.exec(message);
                console.log(res);
                getIssue(res[2], res[3], res[5]);
            }
        }
	};
	this.client.addListener("message"+channel, this.listener);
}

IssuesBot.prototype.stop = function() {
    this.client.removeListener("message"+this.channel, this.listener);
};

IssuesBot.prototype.ignoreUser = function(user) {
    this.ignoredUsers.push(user);
    var ignores = storage.getItem("ignore");
    ignores[this.channel].push(user);
    storage.setItem("ignore", ignores);
};

function _colorStatus(status) {
	if(status == "open") {
        return " ["+c.green(status)+"] ";
    }
    else {
        return " ["+c.red(status)+"] ";
    }
};

function _additionalInfo(data) {
    var ret = "-- (",
        started = false;
    if(data.assignee != null) {
        ret += "Assignee: " + data.assignee.login;
        started = true;
    }
    if(data.milestone != null) {
        if(started) ret += "; ";
        else started = true;
        ret += "Milestone: " + data.milestone.title;
    }

    if(started)
        return c.grey(ret+") ")
    else
        return "";
};

exports.IssuesBot = IssuesBot;
