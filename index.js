"use strict"
//
exports.plugin = function({
    srcFilename, srcContent, devPath, extensions, Aliases:config, Warning })
{
    // check input
    if (!typeofString(srcFilename, srcContent, devPath)) return
    devPath = setSlash(devPath)
    if ( !srcFilename.has(devPath) ) return
    if ( !(extensions || [ EXT_JS ]).some(ext =>
        srcFilename.endsWith(ext)) ) return
    if ( !(config ||
           console.log("[plugin-resolve-alias] Aliases missing!")) ) return
    //
    const content = Content(srcContent, Warning)
    // create relative path fragment
    const relPath = PARENT_DIR.repeat(distance(srcFilename, devPath))
                    ||
                    CURRENT_DIR
    // find and replace all aliases
    for (const [name, path] of config)
        content.match(name, relPath + path)
    //
    return content.changedSource()
}
//
exports.createWarning = function({ state, text }) {
    const coll = new Set()
    return {
        print: name => !(state || coll.has(name)) &&
                       coll.add(name) &&
                       console.log(text, name)
    }
}
//
exports.createAliases = function({
    config = OBJECT_EMPTY,
    devPath = STRING_EMPTY
}) {
    const alias = new Map()
    for (const [name, path] of Object.entries(config))
        alias.set(unsetSlash(name),
                  unsetSlash(path.tail(devPath)))
    //
    return alias
}
//
//
String.prototype.has = function(val)
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
    PARENT_DIR = "../"
//
const typeofString = (...values) =>
    values.every(value => typeof value === TYPEOF_STRING)
const unsetSlash = value =>
    value.substring(
        +value.startsWith(SLASH),
        value.length - value.endsWith(SLASH)
    )
const setSlash = value => SLASH + unsetSlash(value) + SLASH
//
const distance = (filePath, path) =>
    // count the slashes behind the path
    --filePath.tail(path)
              .split(SLASH)
              .length
//
const Content = (source, warning) => {
    let changed = false
    let src = source
    const changedSource = () => changed && src
    const match = (name, path, regex) =>
        (regex = regexImport(src, name, path)).found() && (
            src = regex.replace(),
            changed |= true,
            warning && warning.print(name)
        )
    //
    return { changedSource, match }
}
//
const regexImport = (source, name, path) => {
    const
        WHITE_SPACE = '\\s+',
        STR_DELIM = `['|"]`,
        STR_SLASH_DELIM = `['|"|\\/]`
    //
    const rx = Rx()
    const createSearch = name =>
        rx.getGlobalSearch(
            rx.setGroup(`import|from`, WHITE_SPACE, STR_DELIM) +
            rx.secure(name) +
            rx.setGroup(STR_SLASH_DELIM)
        )
    //
    const replaceWith = path => rx.getGroup(1) + path + rx.getGroup(2)
    const search = createSearch(name)
    const found = () => search.test(source)
    const replace = () => source.replace(search, replaceWith(path))
    //
    return { found, replace }
}

const Rx = () => {
    const
        LEFT_PAREN = "(", RIGHT_PAREN = ")",
        GLOBAL = 'g', DOLLAR = '$'
    //
    const getGlobalSearch = value => new RegExp(value, GLOBAL)
    const setGroup = (...elem) =>
        LEFT_PAREN + elem.join(STRING_EMPTY) + RIGHT_PAREN
    const getGroup = ord => DOLLAR + ord
    const secure = name => name.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&')
    //
    return { getGlobalSearch, setGroup, getGroup, secure }
}
