var irc = require("irc");
var githubAPI = require("github");
var c = require("irc-colors");

// Github API setup

var github = new githubAPI({
    version: "3.0.0"
});

IssuesBot.prototype.owner = "nightingale-media-player";
IssuesBot.prototype.repo = "nightingale-hacking";
IssuesBot.prototype.client = null;
IssuesBot.prototype.blackList = [];
IssuesBot.prototype.channel = "#nightingale";
function IssuesBot(client, channel, repo) {
    this.blackList = new Array();

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
        getIssue = function(number, to) {
            github.issues.getRepoIssue({
                user: that.owner,
                repo: that.repo,
                number: number
            },
            function(e, data) {
                if(!e) {
                    var msg = (data.pull_request&&data.pull_request.url!=null?"Pull ":"Issue ")
                                + c.bold("#"+data.number)
                                + ": "
                                + data.title
                                + _colorStatus(data.state)
                                + _additionalInfo(data)
                                + data.html_url;
                    that.client.say(to, msg);
                }
            });
        };
	this.client.addListener("message"+channel, function(from, to, message) {
        if(that.blackList.indexOf(from) == -1) {
	        var pattern = /#([1-9][0-9]*)/g,
                issueLinkPattern = new RegExp("https?:\/\/(www\.)?github\.com\/"+that.owner+"\/"+that.repo+"\/(issues|pull)\/([1-9][0-9]*)");
	        if(pattern.test(message)) {
	            // reset the regexp pattern
	            pattern.lastIndex = 0;
	            var res;
	            while((res = pattern.exec(message)) !== null) {
	                getIssue(res[1], to);
	            }
	        }
            else if(issueLinkPattern.test(message)) {
                getIssue(issueLinkPattern.exec(message)[3], to);
            }
        }
	});
}

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
