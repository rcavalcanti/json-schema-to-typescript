import { Settings } from './index';
export declare abstract class TsType<T> {
    protected value: T;
    id: string;
    description?: string;
    constructor(value: T);
    protected safeId(): string;
    protected toBlockComment(): string;
    isSimpleType(): boolean;
    toDeclaration(settings: Settings): string;
    toType(settings: Settings): string;
    abstract toString(settings: Settings): string;
}
export interface TsProp<T> {
    name: string;
    required: boolean;
    type: TsType<T>;
}
export declare class Any extends TsType<void> {
    constructor();
    toString(): string;
}
export declare class String extends TsType<void> {
    constructor();
    toString(): string;
}
export declare class Boolean extends TsType<void> {
    constructor();
    toString(): string;
}
export declare class Number extends TsType<void> {
    constructor();
    toString(): string;
}
export declare class Object extends TsType<void> {
    constructor();
    toString(): string;
}
export declare class Null extends TsType<void> {
    constructor();
    toString(): string;
}
export declare class Literal<T> extends TsType<T> {
    toString(): string;
}
export declare class Reference extends TsType<string> {
    toString(): string;
}
export declare class EnumValue extends TsType<string> {
    identifier: string;
    value: string;
    constructor([identifier, value]: string[]);
    toDeclaration(): string;
    toString(): string;
}
export declare class Enum extends TsType<EnumValue[]> {
    id: string;
    constructor(id: string, value: EnumValue[]);
    isSimpleType(): boolean;
    toString(settings: Settings): string;
    toDeclaration(settings: Settings): string;
}
export declare class Array extends TsType<TsType<any>> {
    constructor(value?: TsType<any>);
    toString(settings: Settings): string;
}
export declare class Intersection<T> extends TsType<TsType<T>[]> {
    isSimpleType(): boolean;
    toString(settings: Settings): string;
}
export declare class Union<T> extends TsType<TsType<T>[]> {
    isSimpleType(): boolean;
    toString(settings: Settings): string;
}
export declare class Interface extends TsType<TsProp<any>[]> {
    static reference(id: string): Interface;
    toString(settings: Settings): string;
    isSimpleType(): boolean;
    toDeclaration(settings: Settings): string;
}
