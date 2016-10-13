"use strict";
var TsType = require('./TsTypes');
var fs_1 = require('fs');
var lodash_1 = require('lodash');
var path_1 = require('path');
var RuleType;
(function (RuleType) {
    RuleType[RuleType["Any"] = 0] = "Any";
    RuleType[RuleType["TypedArray"] = 1] = "TypedArray";
    RuleType[RuleType["Enum"] = 2] = "Enum";
    RuleType[RuleType["AllOf"] = 3] = "AllOf";
    RuleType[RuleType["AnyOf"] = 4] = "AnyOf";
    RuleType[RuleType["Reference"] = 5] = "Reference";
    RuleType[RuleType["NamedSchema"] = 6] = "NamedSchema";
    RuleType[RuleType["AnonymousSchema"] = 7] = "AnonymousSchema";
    RuleType[RuleType["String"] = 8] = "String";
    RuleType[RuleType["Number"] = 9] = "Number";
    RuleType[RuleType["Null"] = 10] = "Null";
    RuleType[RuleType["Object"] = 11] = "Object";
    RuleType[RuleType["Array"] = 12] = "Array";
    RuleType[RuleType["Boolean"] = 13] = "Boolean";
    RuleType[RuleType["Literal"] = 14] = "Literal";
    RuleType[RuleType["NamedEnum"] = 15] = "NamedEnum";
    RuleType[RuleType["Union"] = 16] = "Union";
})(RuleType || (RuleType = {}));
var EnumType;
(function (EnumType) {
    EnumType[EnumType["Boolean"] = 0] = "Boolean";
    EnumType[EnumType["Number"] = 1] = "Number";
    EnumType[EnumType["String"] = 2] = "String";
})(EnumType || (EnumType = {}));
var Compiler = (function () {
    function Compiler(schema, filePath, settings) {
        if (filePath === void 0) { filePath = ''; }
        this.schema = schema;
        this.filePath = path_1.parse(path_1.resolve(filePath));
        this.declarations = new Map;
        this.namedEnums = new Map;
        this.id = schema.title || schema.id || this.filePath.name || 'Interface1';
        this.settings = Object.assign({}, Compiler.DEFAULT_SETTINGS, settings);
        this.declareType(this.toTsType(this.schema, '', true), this.id, this.id);
    }
    Compiler.prototype.toString = function () {
        var _this = this;
        return Array.from(this.namedEnums.values()).concat(Array.from(this.declarations.values()))
            .map(function (_) { return _.toDeclaration(_this.settings); })
            .join('\n');
    };
    Compiler.prototype.isRequired = function (propertyName, schema) {
        return schema.required ? schema.required.indexOf(propertyName) > -1 : false;
    };
    Compiler.prototype.supportsAdditionalProperties = function (schema) {
        return schema.additionalProperties === true || lodash_1.isPlainObject(schema.additionalProperties);
    };
    Compiler.prototype.getRuleType = function (rule) {
        // normalize rule
        // TODO: move this somewhere else
        // TODO: avoid mutating rule
        if (rule.type && Array.isArray(rule.type) && rule.type.length === 1) {
            rule.type = rule.type[0];
        }
        if (rule.type === 'array' && rule.items) {
            return RuleType.TypedArray;
        }
        if (rule.enum && rule.tsEnumNames) {
            return RuleType.NamedEnum;
        }
        if (rule.enum) {
            return RuleType.Enum;
        }
        if (rule.properties || rule.additionalProperties) {
            return RuleType.NamedSchema;
        }
        if (rule.allOf) {
            return RuleType.AllOf;
        }
        if (rule.anyOf) {
            return RuleType.AnyOf;
        }
        if (rule.$ref) {
            return RuleType.Reference;
        }
        switch (rule.type) {
            case 'array': return RuleType.Array;
            case 'boolean': return RuleType.Boolean;
            case 'integer':
            case 'number': return RuleType.Number;
            case 'null': return RuleType.Null;
            case 'object': return RuleType.Object;
            case 'string': return RuleType.String;
        }
        if (Array.isArray(rule.type)) {
            return RuleType.Union;
        }
        if (this.isNumberLiteral(rule)) {
            return RuleType.Number;
        }
        if (!lodash_1.isPlainObject(rule)) {
            return RuleType.Literal;
        }
        if (lodash_1.isPlainObject(rule)) {
            return RuleType.AnonymousSchema; // TODO: is it safe to do this as a catchall?
        }
        return RuleType.Any;
    };
    Compiler.prototype.isNumberLiteral = function (a) {
        return /^[\d\.]+$/.test(a);
    };
    Compiler.prototype.resolveRefFromLocalFS = function (refPath, propName) {
        var fullPath = path_1.resolve(path_1.join(this.filePath.dir, refPath));
        if (fullPath.startsWith('http')) {
            throw new ReferenceError('Remote http references are not yet supported.  Could not read ' + fullPath);
        }
        var file = tryFn(function () { return fs_1.readFileSync(fullPath); }, function () { throw new ReferenceError("Unable to find referenced file \"" + fullPath + "\""); });
        var contents = tryFn(function () { return JSON.parse(file.toString()); }, function () { throw new TypeError("Referenced local schema \"" + fullPath + "\" contains malformed JSON"); });
        var targetType = this.toTsType(contents, propName, true);
        var id = targetType.id
            ? targetType.toType(this.settings)
            : path_1.parse(fullPath).name;
        if (this.settings.declareReferenced) {
            this.declareType(targetType, id, id);
        }
        return new TsType.Reference(id);
    };
    // eg. "#/definitions/diskDevice" => ["definitions", "diskDevice"]
    // only called in case of a $ref type
    Compiler.prototype.resolveRef = function (refPath, propName) {
        if (refPath === '#' || refPath === '#/') {
            return TsType.Interface.reference(this.id);
        }
        if (refPath[0] !== '#') {
            return this.resolveRefFromLocalFS(refPath, propName);
        }
        var parts = refPath.slice(2).split('/');
        var existingRef = this.declarations.get(parts.join('/'));
        // resolve existing declaration?
        if (existingRef) {
            return existingRef;
        }
        // resolve from elsewhere in the schema
        var type = this.toTsType(lodash_1.get(this.schema, parts.join('.')));
        if (this.settings.declareReferenced || !type.isSimpleType()) {
            this.declareType(type, parts.join('/'), this.settings.useFullReferencePathAsName ? parts.join('/') : lodash_1.last(parts));
        }
        return type;
    };
    Compiler.prototype.declareType = function (type, refPath, id) {
        type.id = id;
        this.declarations.set(refPath, type);
        return type;
    };
    Compiler.prototype.generateEnumName = function (rule, propName) {
        return rule.id || propName || "Enum" + this.namedEnums.size;
    };
    Compiler.prototype.generateTsType = function (rule, propName, isReference) {
        var _this = this;
        if (isReference === void 0) { isReference = false; }
        switch (this.getRuleType(rule)) {
            case RuleType.AnonymousSchema:
            case RuleType.NamedSchema:
                return this.toTsDeclaration(rule);
            case RuleType.Enum:
                return new TsType.Union(rule.enum.map(function (_) { return new TsType.Literal(_); }));
            case RuleType.NamedEnum:
                Compiler.validateNamedEnum(rule);
                var name = this.generateEnumName(rule, propName);
                var tsEnum = new TsType.Enum(name, lodash_1.zip(rule.tsEnumNames, rule.enum).map(function (_) { return new TsType.EnumValue(_); }));
                this.namedEnums.set(name, tsEnum);
                return tsEnum;
            case RuleType.Any: return new TsType.Any;
            case RuleType.Literal: return new TsType.Literal(rule);
            case RuleType.TypedArray: return new TsType.Array(this.toTsType(rule.items));
            case RuleType.Array: return new TsType.Array;
            case RuleType.Boolean: return new TsType.Boolean;
            case RuleType.Null: return new TsType.Null;
            case RuleType.Number: return new TsType.Number;
            case RuleType.Object: return new TsType.Object;
            case RuleType.String: return new TsType.String;
            case RuleType.AllOf:
                return new TsType.Intersection(rule.allOf.map(function (_) { return _this.toTsType(_); }));
            case RuleType.AnyOf:
                return new TsType.Union(rule.anyOf.map(function (_) { return _this.toTsType(_); }));
            case RuleType.Reference:
                return this.resolveRef(rule.$ref, propName);
            case RuleType.Union:
                return new TsType.Union(rule.type.map(function (_) { return _this.toTsType({ type: _ }); }));
        }
        throw new Error('Unknown rule:' + rule.toString());
    };
    Compiler.validateNamedEnum = function (rule) {
        if (rule.tsEnumNames.length !== rule.enum.length) {
            throw new TypeError("Property enum and property tsEnumNames must be the same length: " + JSON.stringify(rule));
        }
        if (rule.tsEnumNames.some(function (_) { return typeof _ !== 'string'; })) {
            throw TypeError('If tsEnumValue is declared, it must be an array of strings');
        }
    };
    Compiler.prototype.toTsType = function (rule, propName, isReference) {
        if (isReference === void 0) { isReference = false; }
        var type = this.generateTsType(rule, propName, isReference);
        if (!type.id) {
            // the type is not declared, let's check if we should declare it or keep it inline
            type.id = rule.title || rule.id; // TODO: fix types
            if (type.id && !isReference)
                this.declareType(type, type.id, type.id);
        }
        type.description = type.description || rule.description;
        return type;
    };
    Compiler.prototype.toTsDeclaration = function (schema) {
        var _this = this;
        var copy = lodash_1.merge({}, Compiler.DEFAULT_SCHEMA, schema);
        var props = lodash_1.map(copy.properties, function (v, k) {
            return {
                name: k,
                required: _this.isRequired(k, copy),
                type: _this.toTsType(v, k)
            };
        });
        if (props.length === 0 && !('additionalProperties' in schema)) {
            if ('default' in schema)
                return new TsType.Null;
        }
        if (this.supportsAdditionalProperties(copy)) {
            var short = copy.additionalProperties === true;
            if (short && props.length === 0)
                return new TsType.Any;
            var type = short ? new TsType.Any : this.toTsType(copy.additionalProperties);
            props.push({
                name: '[k: string]',
                required: true,
                type: type
            }); // TODO: fix type
        }
        return new TsType.Interface(props);
    };
    Compiler.DEFAULT_SETTINGS = {
        declareReferenced: true,
        endPropertyWithSemicolon: true,
        endTypeWithSemicolon: true,
        useConstEnums: true,
        useFullReferencePathAsName: false
    };
    Compiler.DEFAULT_SCHEMA = {
        additionalProperties: true,
        properties: {},
        required: [],
        type: 'object'
    };
    return Compiler;
}());
function compile(schema, path, settings) {
    return new Compiler(schema, path, settings).toString();
}
exports.compile = compile;
function compileFromFile(inputFilename, settings) {
    return new Promise(function (resolve, reject) {
        return fs_1.readFile(inputFilename, function (err, data) {
            if (err) {
                reject(err);
            }
            else {
                console.log('Generating Typescript for ' + inputFilename);
                resolve(compile(JSON.parse(data.toString()), inputFilename, settings));
            }
        });
    });
}
exports.compileFromFile = compileFromFile;
function compileFromFiles(inputFilenames, settings) {
    // empty string in Promise to use as seed in reduce (foldLeft)
    var seed = Promise.resolve('');
    return inputFilenames.reduce(function (acc, currentFile, x, y) {
        return acc.then(function (prevCompilation) {
            return compileFromFile(currentFile, settings).then(function (thisCompilation) {
                // interrupt compilation if current compilation fails
                if (thisCompilation instanceof Error) {
                    throw thisCompilation;
                }
                // concat previous with thisCompilation
                if (typeof thisCompilation === 'string') {
                    return prevCompilation + '\n' + thisCompilation;
                }
            });
        });
    }, seed);
}
exports.compileFromFiles = compileFromFiles;
// TODO: pull out into a separate package
function tryFn(fn, err) {
    try {
        return fn();
    }
    catch (e) {
        return err(e);
    }
}
//# sourceMappingURL=index.js.map