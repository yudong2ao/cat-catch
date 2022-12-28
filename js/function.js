/*公共函数*/
// 秒转换成时间
function secToTime(sec) {
    let time = "";
    let hour = Math.floor(sec / 3600);
    let min = Math.floor((sec % 3600) / 60);
    sec = Math.floor(sec % 60);
    if (hour > 0) {
        time = hour + ":";
    }
    if (min < 10) {
        time += "0";
    }
    time += min + ":";
    if (sec < 10) {
        time += "0";
    }
    time += sec;
    return time;
}
// 字节转换成大小
function byteToSize(byte) {
    if (!byte || byte < 1024) { return 0; }
    if (byte < 1024 * 1024) {
        return parseFloat((byte / 1024).toFixed(1)) + "KB";
    } else if (byte < 1024 * 1024 * 1024) {
        return parseFloat((byte / 1024 / 1024).toFixed(1)) + "MB";
    } else {
        return parseFloat((byte / 1024 / 1024 / 1024).toFixed(1)) + "GB";
    }
}
// 替换掉不允许的文件名称字符
function stringModify(str) {
    if (!str) { return str; }
    return str.replace(reStringModify, function (m) {
        return {
            "'": '&#39;',
            '\\': '&#92;',
            '/': '&#47;',
            ':': '&#58;',
            '*': '&#42;',
            '?': '&#63;',
            '"': '&quot;',
            '<': '&lt;',
            '>': '&gt;',
            '|': '&#124;',
            '~': '_'
        }[m];
    });
}
// Firefox download API 无法下载 data URL
function downloadDataURL(url, filename) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    delete link;
}
// 判断是否为空
function isEmpty(obj) {
    return (typeof obj == "undefined" ||
        obj == null ||
        obj == "" ||
        obj == " ")
}

// 修改请求头Referer
function setReferer(referer, callback) {
    chrome.tabs.getCurrent(function (tabs) {
        chrome.declarativeNetRequest.updateSessionRules({
            removeRuleIds: [tabs.id],
            addRules: [{
                "id": tabs.id,
                "action": {
                    "type": "modifyHeaders",
                    "requestHeaders": [{
                        "header": "Referer",
                        "operation": "set",
                        "value": referer
                    }]
                },
                "condition": {
                    "tabIds": [tabs.id],
                    "resourceTypes": ["xmlhttprequest"]
                }
            }]
        }, function () {
            callback && callback();
        });
    });
}
function deleteReferer(callback) {
    chrome.tabs.getCurrent(function (tabs) {
        chrome.declarativeNetRequest.updateSessionRules({
            removeRuleIds: [tabs.id]
        }, function () {
            callback && callback();
        });
    });
}

// 模板 函数 实现
function templatesFunction(text, action, arg) {
    action = action.trim();
    arg = arg.split(",");
    arg = arg.map(item => {
        item = item.trim();
        if(item[0] == "'" || item[0] == '"'){
            item = item.slice(1);
        }
        const length = item.length - 1;
        if(item[length] == "'" || item[length] == '"'){
            item = item.slice(0, length);
        }
        return item;
    });
    if (action == "slice") {
        return text.slice(...arg);
    }
    if (action == "replace") {
        return text.replace(...arg);
    }
    if (action == "replaceAll") {
        return text.replaceAll(...arg);
    }
    if (action == "regexp") {
        arg = new RegExp(...arg);
        const result = text.match(arg);
        if (result && result.length >= 2) {
            text = "";
            for (let i = 1; i < result.length; i++) {
                text += result[i].trim();
            }
        }
        return text;
    }
    if (action == "exists") {
        if(text){
            return arg[0].replaceAll("*", text);
        }
        return "";
    }
    return text;
}
function templates(text, data) {
    // 旧标签
    text = text.replaceAll("$url$", data.url);
    text = text.replaceAll("$referer$", data.referer ?? data.initiator);
    text = text.replaceAll("$title$", data.title);
    // 新标签
    text = text.replaceAll("${url}", data.url);
    text = text.replace(/\${url ?\| ?([^:]+):([^}]+)}/g, function (text, action, arg) {
        return templatesFunction(data.url, action, arg);
    });
    text = text.replaceAll("${referer}", data.referer ?? data.initiator);
    text = text.replace(/\${referer ?\| ?([^:]+):([^}]+)}/g, function (text, action, arg) {
        return templatesFunction(data.referer, action, arg);
    });
    text = text.replaceAll("${title}", data.title);
    text = text.replace(/\${title ?\| ?([^:]+):([^}]+)}/g, function (text, action, arg) {
        return templatesFunction(data.title, action, arg);
    });
    // 日期
    const date = new Date();
    text = text.replaceAll("${year}", date.getFullYear());
    text = text.replaceAll("${month}", date.getMonth() + 1);
    text = text.replaceAll("${day}", date.getDate());
    text = text.replaceAll("${hours}", date.getHours());
    text = text.replaceAll("${minutes}", date.getMinutes());
    text = text.replaceAll("${seconds}", date.getSeconds());
    text = text.replaceAll("${date}", `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`);
    text = text.replaceAll("${time}", `${date.getHours()}'${date.getMinutes()}'${date.getSeconds()}`);
    // fullfilename
    const fullfilename = new URL(data.url).pathname.split("/").pop();
    text = text.replaceAll("${fullfilename}", fullfilename);
    text = text.replace(/\${fullfilename ?\| ?([^:]+):([^}]+)}/g, function (text, action, arg) {
        return templatesFunction(fullfilename, action, arg);
    });
    // filename
    let filename = fullfilename.split(".");
    filename.length > 1 && filename.pop();
    filename = filename.join(".");
    filename = isEmpty(filename) ? "NULL" : filename;
    text = text.replaceAll("${filename}", filename);
    text = text.replace(/\${filename ?\| ?([^:]+):([^}]+)}/g, function (text, action, arg) {
        return templatesFunction(filename, action, arg);
    });
    // ext
    let ext = fullfilename.split(".");
    ext = ext.length == 1 ? "NULL" : ext[ext.length - 1];
    ext = isEmpty(ext) ? "NULL" : ext;
    text = text.replaceAll("${ext}", ext);
    text = text.replace(/\${ext ?\| ?([^:]+):([^}]+)}/g, function (text, action, arg) {
        return templatesFunction(ext, action, arg);
    });
    return text;
}