/// <reference types="node" />
import { JSONSchema } from './JSONSchema';
export interface Settings {
    declareReferenced?: boolean;
    endPropertyWithSemicolon?: boolean;
    endTypeWithSemicolon?: boolean;
    useConstEnums?: boolean;
    useFullReferencePathAsName?: boolean;
}
export declare function compile(schema: JSONSchema, path: string | undefined, settings?: Settings): string;
export declare function compileFromFile(inputFilename: string): Promise<string | NodeJS.ErrnoException>;
