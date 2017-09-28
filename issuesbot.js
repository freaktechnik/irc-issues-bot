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
        return c.green(` [${status}] `);
    }

    return c.red(` [${status}] `);
}

function _additionalInfo(data) {
    let ret = "-- (",
        started = false;
    if(data.assignees && data.assignees.length) {
        ret += `Assignees: ${data.assignees.map((a) => a.login).join(", ")}`;
        started = true;
    }
    else if(data.assignee != null) {
        ret += `Assignee: ${data.assignee.login}`;
        started = true;
    }
    if(data.milestone != null) {
        if(started) {
            ret += "; ";
        }
        else {
            started = true;
        }
        ret += `Milestone: ${data.milestone.title}`;
    }

    if(started) {
        return c.grey(`${ret}) `);
    }

    return "";
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
        const [
            owner,
            repoName
        ] = repo.split("/");
        this.owner = owner;
        this.repo = repoName;
    }

    this.channel = channel;

    const getIssue = (owner, repoName, number) => github.issues.get({
        owner,
        repoName,
        number
    }).then(({ data }) => {
        const msg = `${(owner != this.owner || repoName != this.repo ? c.grey(`${owner}/${repoName} `) : "") +
                        (data.pull_request && data.pull_request.url != null ? "Pull " : "Issue ") +
                        c.bold(`#${data.number}`)
        }: ${
            data.title
        }${_colorStatus(data.state)
        }${_additionalInfo(data)
        }${data.html_url}`;
        this.client.say(this.channel, msg);
    });
    this.listener = (from, message) => {
        if(!this.ignoredUsers.includes(from)) {
            const pattern = /(?:^|\s|(\b[a-zA-Z0-9-]+\/[^#/]+))#([1-9][0-9]*)\b/g,
                issueLinkPattern = /\bhttps?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/(?:issues|pull)\/([1-9][0-9]*)\b/g,
                foundIssues = [];
            if(pattern.test(message)) {
                // reset the regexp pattern
                pattern.lastIndex = 0;
                let owner,
                    repoName;
                let [
                    match,
                    rep,
                    number
                ] = pattern.exec(message);
                while(match) {
                    if(rep) {
                        [
                            owner,
                            repoName
                        ] = rep.split("/");
                    }
                    else {
                        owner = this.owner;
                        repoName = this.repo;
                    }
                    if(!foundIssues.includes(`${owner}/${repoName}#${number}`)) {
                        foundIssues.push(`${owner}/${repoName}#${number}`);
                        getIssue(owner, repoName, number);
                    }
                    [
                        match,
                        rep,
                        number
                    ] = pattern.exec(message);
                }
            }
            if(issueLinkPattern.test(message)) {
                issueLinkPattern.lastIndex = 0;
                let [
                    match,
                    owner,
                    repoName,
                    number
                ] = issueLinkPattern.exec(message);
                while(match) {
                    if(!foundIssues.includes(`${owner}/${repoName}#${number}`)) {
                        foundIssues.push(`${owner}/${repoName}#${number}`);
                        getIssue(owner, repoName, number);
                    }
                    [
                        match,
                        owner,
                        repoName,
                        number
                    ] = issueLinkPattern.exec(message);
                }
            }
        }
    };
    this.client.addListener(`message${channel}`, this.listener);

    this.description = `IssuesBot for ${repo}`;
}

IssuesBot.prototype.owner = "";
IssuesBot.prototype.repo = "";
IssuesBot.prototype.client = null;
IssuesBot.prototype.ignoredUsers = [];
IssuesBot.prototype.channel = "";

IssuesBot.prototype.stop = function() {
    this.client.removeListener(`message${this.channel}`, this.listener);
};

IssuesBot.prototype.ignoreUser = function(user) {
    this.ignoredUsers.push(user);
    const ignores = storage.getItem("ignore");
    ignores[this.channel].push(user);
    storage.setItem("ignore", ignores);
};

exports.IssuesBot = IssuesBot;
