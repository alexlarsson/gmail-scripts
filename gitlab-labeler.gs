// This code is based on https://github.com/paoloantinori/gmail-labeler

// Combine this with a gmail filter:
// Matches: ((from:from:gitlab-issues@gnome.org)
// Do this: Apply label "bugs/gnome"

var ROOT_LABEL = "bugs/gnome";
var from = [
    "from:gitlab-issues@gnome.org"
];

// Example gitlab mail:
// From: Philip Withnall <gitlab-issues@gnome.org>
// Subject: Re: GLib | [PATCH] gmacros: Add G_GNUC_UNUSED for autoptr funcs (notably GLists) (#1390)
// X-GitLab-Project: GLib
// X-GitLab-Project-Id: 658
// X-GitLab-Project-Path: GNOME/glib
// X-GitLab-Issue-ID: 40946
// X-GitLab-Reply-Key: 1ec868cc0e38de7d93dc10e221dec7ca

var filters = [
    { id: "X-GitLab-Project", match: /X-GitLab-Project:\s(.+?)\s/i }, // organize by project name
];

var ROOT_FOLDER = ROOT_LABEL + "/";
var SELECTION = "label:" + ROOT_LABEL;

function labeler() {
    var batchSize = 50;
    var labelCache = {};
    var query = "in:inbox AND (" + from.join(' OR ') + ")";
    if (SELECTION) {
        query += " AND (" + SELECTION + ")";
    }
    var threads = GmailApp.search(query, 0, batchSize);
    GmailApp.getMessagesForThreads(threads);

    var findOrCreateLabel = function(name) {
        if (labelCache[name] === undefined) {
            var labelObject = GmailApp.getUserLabelByName(name);
            if( labelObject ) {
                labelCache[name] = labelObject;
            } else {
                labelCache[name] = GmailApp.createLabel(name);
                Logger.log("Created new label: [" + name + "]");
            }
        }
        return labelCache[name];
    }

    var applyLabel = function(name, thread) {
        name = ROOT_FOLDER + name;

        var label = null;
        var labelName = "";

        // create nested labels by parsing "/"
        name.split('/').forEach(function(labelPart, i) {
            labelName = labelName + (i===0 ? "" : "/") + labelPart.trim();
            label = findOrCreateLabel(labelName);
        });

        thread.addLabel(label);
    }

    threads.forEach(function(thread) {
        var messages = thread.getMessages();
        if (messages == null)
            return; // nothing to do

        var message = messages[messages.length - 1]; // most recent message
        var body = message.getRawContent();
        var subject = message.getSubject();
        Logger.log("Message: " + subject);
        //Logger.log("Body: " + body);
        var matchedAny = false
        filters.forEach(function(filter) {
            var matches = filter.match.exec(body);
            if (matches !== null) {
                matchedAny = true
                // label will be regex match or name provided
                var label = filter.name || matches[1];
                if (label !== undefined) {
                    label = label.toLowerCase();
                    Logger.log(" Applying label: " + label);
                  applyLabel(label, thread);
                }
            }
        });
        if (matchedAny) {
            Logger.log(" Archiving");
            thread.moveToArchive();
        } else {
            Logger.log(" No matching filter, leaving in inbox");
        }
    });
}
