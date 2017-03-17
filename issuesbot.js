"use strict";

const irc = require("irc"),
    GithubAPI = require("github"),
    c = require("irc-colors"),
    storage = require("./storage"),
    github = new GithubAPI({
        protocol: "https",
        promise: Promise
    });

function _colorStatus(status) {
    if(status == "open") {
        return c.green(" [" + status + "] ");
    }
    else {
        return c.red(" [" + status + "] ");
    }
}

function _additionalInfo(data) {
    let ret = "-- (",
        started = false;
    if(data.assignees && data.assignees.length) {
        ret += "Assignees: " + data.assignees.map((a) => a.login).join(", ");
        started = true;
    }
    else if(data.assignee != null) {
        ret += "Assignee: " + data.assignee.login;
        started = true;
    }
    if(data.milestone != null) {
        if(started) {
            ret += "; ";
        }
        else {
            started = true;
        }
        ret += "Milestone: " + data.milestone.title;
    }

    if(started) {
        return c.grey(ret + ") ");
    }
    else {
        return "";
    }
}

function IssuesBot(client, channel, repo) {
    if(!storage.getItem("ignore")) {
        storage.setItem("ignore", {});
    }

    const ignores = storage.getItem("ignore");
    if(!ignores[channel]) {
        ignores[channel] = [];
        storage.setItem("ignore", ignores);
    }

    this.ignoredUsers = ignores[channel];

    if(!client || !(client instanceof irc.Client)) {
        throw new Error("Must pass an irc client argument to the constructor.");
    }
    else {
        this.client = client;
    }

    if(repo) {
        const details = repo.split("/");
        this.owner = details[0];
        this.repo = details[1];
    }

    this.channel = channel;

    const getIssue = (owner, repo, number) => {
        return github.issues.get({
            owner,
            repo,
            number
        }).then(({ data }) => {
            const msg = (owner != this.owner || repo != this.repo ? c.grey(owner + "/" + repo + " ") : "") +
                        (data.pull_request && data.pull_request.url != null ? "Pull " : "Issue ") +
                        c.bold("#" + data.number) +
                        ": " +
                        data.title +
                        _colorStatus(data.state) +
                        _additionalInfo(data) +
                        data.html_url;
            this.client.say(this.channel, msg);
        });
    };
    this.listener = (from, message) => {
        if(this.ignoredUsers.indexOf(from) == -1) {
            const pattern = /\b([a-zA-Z0-9-]+\/[^#/]+)?#([1-9][0-9]*)\b/g,
                issueLinkPattern = /\bhttps?:\/\/(www\.)?github\.com\/([^/]+)\/([^/]+)\/(issues|pull)\/([1-9][0-9]*)\b/g,
                foundIssues = [];
            if(pattern.test(message)) {
                // reset the regexp pattern
                pattern.lastIndex = 0;
                let res,
                    owner,
                    repo;
                while((res = pattern.exec(message)) !== null) {
                    if(res[1] !== undefined) {
                        owner = res[1].split("/")[0];
                        repo = res[1].split("/")[1];
                    }
                    else {
                        owner = this.owner;
                        repo = this.repo;
                    }
                    if(foundIssues.indexOf(owner + "/" + repo + "#" + res[2]) == -1) {
                        foundIssues.push(owner + "/" + repo + "#" + res[2]);
                        getIssue(owner, repo, res[2]);
                    }
                }
            }
            if(issueLinkPattern.test(message)) {
                issueLinkPattern.lastIndex = 0;
                let res;
                while((res = issueLinkPattern.exec(message)) !== null) {
                    if(foundIssues.indexOf(res[2] + "/" + res[3] + "#" + res[5]) == -1) {
                        foundIssues.push(res[2] + "/" + res[3] + "#" + res[5]);
                        getIssue(res[2], res[3], res[5]);
                    }
                }
            }
        }
    };
    this.client.addListener("message" + channel, this.listener);

    this.description = "IssuesBot for " + repo;
}

IssuesBot.prototype.owner = "";
IssuesBot.prototype.repo = "";
IssuesBot.prototype.client = null;
IssuesBot.prototype.ignoredUsers = [];
IssuesBot.prototype.channel = "";

IssuesBot.prototype.stop = function() {
    this.client.removeListener("message" + this.channel, this.listener);
};

IssuesBot.prototype.ignoreUser = function(user) {
    this.ignoredUsers.push(user);
    const ignores = storage.getItem("ignore");
    ignores[this.channel].push(user);
    storage.setItem("ignore", ignores);
};

exports.IssuesBot = IssuesBot;
