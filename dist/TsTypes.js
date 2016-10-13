"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var lodash_1 = require('lodash');
var COMMENT_START = '/**';
var COMMENT_INDENT = ' * ';
var COMMENT_END = ' */';
var INDENT_STRING = '  ';
var TsType = (function () {
    function TsType(value) {
        this.value = value;
    }
    TsType.prototype.safeId = function () {
        return nameToTsSafeName(this.id);
    };
    TsType.prototype.toBlockComment = function () {
        return this.description && !this.isSimpleType()
            ? generateComment(this.description).join('\n') + "\n"
            : '';
    };
    TsType.prototype.isSimpleType = function () { return true; };
    TsType.prototype.toDeclaration = function (settings) {
        return this.toBlockComment()
            + ("export type " + this.safeId() + " = " + this.toString(settings))
            + (settings.endTypeWithSemicolon ? ';' : '');
    };
    TsType.prototype.toType = function (settings) {
        return this.safeId() || this.toString(settings);
    };
    return TsType;
}());
exports.TsType = TsType;
var Any = (function (_super) {
    __extends(Any, _super);
    function Any() {
        _super.call(this, undefined);
    }
    Any.prototype.toString = function () {
        return 'any';
    };
    return Any;
}(TsType));
exports.Any = Any;
var String = (function (_super) {
    __extends(String, _super);
    function String() {
        _super.call(this, undefined);
    }
    String.prototype.toString = function () {
        return 'string';
    };
    return String;
}(TsType));
exports.String = String;
var Boolean = (function (_super) {
    __extends(Boolean, _super);
    function Boolean() {
        _super.call(this, undefined);
    }
    Boolean.prototype.toString = function () {
        return 'boolean';
    };
    return Boolean;
}(TsType));
exports.Boolean = Boolean;
var Number = (function (_super) {
    __extends(Number, _super);
    function Number() {
        _super.call(this, undefined);
    }
    Number.prototype.toString = function () {
        return 'number';
    };
    return Number;
}(TsType));
exports.Number = Number;
var Object = (function (_super) {
    __extends(Object, _super);
    function Object() {
        _super.call(this, undefined);
    }
    Object.prototype.toString = function () {
        return 'Object';
    };
    return Object;
}(TsType));
exports.Object = Object;
var Null = (function (_super) {
    __extends(Null, _super);
    function Null() {
        _super.call(this, undefined);
    }
    Null.prototype.toString = function () {
        return 'null';
    };
    return Null;
}(TsType));
exports.Null = Null;
var Literal = (function (_super) {
    __extends(Literal, _super);
    function Literal() {
        _super.apply(this, arguments);
    }
    Literal.prototype.toString = function () {
        return JSON.stringify(this.value);
    };
    return Literal;
}(TsType));
exports.Literal = Literal;
var Reference = (function (_super) {
    __extends(Reference, _super);
    function Reference() {
        _super.apply(this, arguments);
    }
    Reference.prototype.toString = function () { return this.value; };
    return Reference;
}(TsType));
exports.Reference = Reference;
var EnumValue = (function (_super) {
    __extends(EnumValue, _super);
    function EnumValue(_a) {
        var identifier = _a[0], value = _a[1];
        _super.call(this, value);
        this.identifier = identifier;
    }
    EnumValue.prototype.toDeclaration = function () {
        // if there is a value associated with the identifier, declare as identifier=value
        // else declare as identifier
        return "" + this.identifier + (this.value ? (' = ' + this.value) : '');
    };
    EnumValue.prototype.toString = function () {
        return "Enum" + this.identifier;
    };
    return EnumValue;
}(TsType));
exports.EnumValue = EnumValue;
var Enum = (function (_super) {
    __extends(Enum, _super);
    function Enum(id, value) {
        _super.call(this, value);
        this.id = id;
    }
    Enum.prototype.isSimpleType = function () { return false; };
    Enum.prototype.toString = function (settings) {
        return this.safeId();
    };
    Enum.prototype.toDeclaration = function (settings) {
        return this.toBlockComment()
            + ("export " + (settings.useConstEnums ? 'const ' : '') + "enum " + this.safeId() + " {")
            + '\n'
            + INDENT_STRING
            + this.value.map(function (_) { return _.toDeclaration(); }).join(",\n" + INDENT_STRING)
            + '\n'
            + '}';
    };
    return Enum;
}(TsType));
exports.Enum = Enum;
var Array = (function (_super) {
    __extends(Array, _super);
    function Array(value) {
        if (value === void 0) { value = new Any; }
        _super.call(this, value);
    }
    Array.prototype.toString = function (settings) {
        var type = this.value.toType(settings);
        return (type.indexOf('|') > -1 || type.indexOf('&') > -1 ? "(" + type + ")" : type) + "[]"; // hacky
    };
    return Array;
}(TsType));
exports.Array = Array;
var Intersection = (function (_super) {
    __extends(Intersection, _super);
    function Intersection() {
        _super.apply(this, arguments);
    }
    Intersection.prototype.isSimpleType = function () { return this.value.length <= 1; };
    Intersection.prototype.toString = function (settings) {
        return this.value
            .filter(function (_) { return !(_ instanceof Null); })
            .map(function (_) { return _.toType(settings); })
            .join(' & ');
    };
    return Intersection;
}(TsType));
exports.Intersection = Intersection;
var Union = (function (_super) {
    __extends(Union, _super);
    function Union() {
        _super.apply(this, arguments);
    }
    Union.prototype.isSimpleType = function () { return this.value.length <= 1; };
    Union.prototype.toString = function (settings) {
        return this.value
            .map(function (_) { return _.toType(settings); })
            .join(' | ');
    };
    return Union;
}(TsType));
exports.Union = Union;
var Interface = (function (_super) {
    __extends(Interface, _super);
    function Interface() {
        _super.apply(this, arguments);
    }
    Interface.reference = function (id) {
        var ret = new Interface([]);
        ret.id = id;
        return ret;
    };
    Interface.prototype.toString = function (settings) {
        return "{\n"
            + (this.value.map(function (_) {
                return ("" + INDENT_STRING + (_.type.description
                    ? generateComment(_.type.description).join("\n" + INDENT_STRING) + ("\n" + INDENT_STRING)
                    : '') + _.name + (_.required ? '' : '?') + ": " + _.type.toType(settings).replace(/\n/g, '\n' + INDENT_STRING) // ghetto nested indents
                 + (settings.endPropertyWithSemicolon ? ';' : ''));
            }).join('\n') + "\n}");
    };
    Interface.prototype.isSimpleType = function () { return false; };
    Interface.prototype.toDeclaration = function (settings) {
        return this.toBlockComment() + "export interface " + this.safeId() + " " + this.toString(settings);
    };
    return Interface;
}(TsType));
exports.Interface = Interface;
// eg.
//   foo -> Foo
//   fooBar -> FooBar
//   foo_1bar -> Foo_1bar
// TODO: more safety
// TODO: unit tests
function nameToTsSafeName(name) {
    return lodash_1.upperFirst(lodash_1.camelCase(name));
}
function generateComment(string) {
    return [
        COMMENT_START
    ].concat(string.split('\n').map(function (_) { return COMMENT_INDENT + _; }), [
        COMMENT_END
    ]);
}
//# sourceMappingURL=TsTypes.js.map