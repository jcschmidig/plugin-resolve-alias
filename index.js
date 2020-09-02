"use strict"
//
export function plugin({
    srcFilename,
    srcContent,
    devPath,
    Aliases,
    Warning
}) {
    // check input
    if ( !(typeof srcFilename === TYPEOF_STRING &&
           srcFilename.has(devPath) &&
           srcFilename.endsWith(EXT_JS) &&
           typeof srcContent === TYPEOF_STRING &&
           Aliases) ) return
    //
    devPath = setSlash(devPath)
    //
    const content = new Content(srcContent, Warning)
    // create relative path fragment
    const relPath = PARENT_DIR.repeat(distance(srcFilename, devPath))
                    ||
                    CURRENT_DIR
    // replace aliases
    for (const [name, path] of Aliases)
        content.replace(name, relPath + path)
    //
    return content.changedSource()
}
//
export function createWarning({ state, text }) {
    const coll = new Set()
    //
    function print(name) {
        !(state || coll.has(name)) &&
        coll.add(name) &&
        console.log(text, name)
    }
    return { print }
}
//
export function createAliases({
    config = OBJECT_EMPTY,
    devPath = STRING_EMPTY
}) {
    const alias = new Map()
    for (const [name, path] of Object.entries(config))
        alias.set(unsetSlash(name), unsetSlash(path.tail(devPath)))
    return alias
}
//
//
String.prototype.has = function(val)
    // ~-1 => 0 => false
    { return ~this.indexOf(val) }
String.prototype.tail = function(sep)
    // rejoin the part behind the separator
    { return this.split(sep).slice(1).join(sep) }
//
const
    TYPEOF_STRING = 'string',
    STRING_EMPTY = '',
    OBJECT_EMPTY = {},
    EXT_JS = ".js",
    SLASH = "/",
    CURRENT_DIR = "./",
    PARENT_DIR = "../",
    LEFT_PAREN = "(",
    RIGHT_PAREN = ")",
    DOLLAR = "$"
//
function unsetSlash(value) {
    if (typeof value !== TYPEOF_STRING) return STRING_EMPTY
    //
    return value.substring(
        // start: false => 0, true => 1
        +value.startsWith(SLASH),
        // length - [ 0 | 1 ]
        value.length - value.endsWith(SLASH)
    )
}
function setSlash(value) {
    return SLASH + unsetSlash(value) + SLASH
}
//
function distance(filePath, path) {
    // count the slashes behind the path
    return --filePath.tail(path)
                     .split(SLASH)
                     .length
}
//
function Content(source, warning) {
    this.changed = false
    this.source = source
    this.warning = warning
    this.changedSource = function() {
        return this.changed && this.source
    }
    this.replace = function(name, path) {
        const regex = new regexImport(this.source, name, path)
        if (!regex.found()) return
        //
        this.source = regex.replace()
        this.changed |= true
        this.warning && this.warning.print(name)
    }
}
//
function regexImport(source, name, path) {
    this.source = source
    this.search = createSearch(name)
    this.path = replaceWith(path)
    this.found = function() {
        return this.search.test(this.source)
    }
    this.replace = function() {
        return this.source.replace(this.search, this.path)
    }
    //
    function createSearch(name) {
        const WHITE_SPACE = '\\s+',
              STR_DELIM = `['|"]`,
              STR_SLASH_DELIM = `['|"|\\/]`,
              GLOBAL = 'g'
        //
        const rx = setGroup(WHITE_SPACE, 'from', WHITE_SPACE, STR_DELIM) +
                   escape(name) +
                   setGroup(STR_SLASH_DELIM)
        //
        return new RegExp(rx, GLOBAL)
    }
    function replaceWith(path) {
        return getGroup(1) + path + getGroup(2)
    }
    function setGroup(...elem) {
        return LEFT_PAREN + elem.join(STRING_EMPTY) + RIGHT_PAREN
    }
    function getGroup(ord) {
        return DOLLAR + ord
    }
    // secure name in regex
    function escape(name) {
        return name.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&')
    }
}