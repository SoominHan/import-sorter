import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import { Observable, Observer } from 'rxjs';

export function readFile$(filePath: string, encoding: string = 'utf-8'): Observable<string> {
    return Observable.create((observer: Observer<string>) => {
        fs.readFile(filePath, encoding, (error, data) => {
            if (error) {
                observer.error(error);
            } else {
                observer.next(data);
                observer.complete();
            }
        });
    });
}

export function writeFile$(filePath: string, data: string): Observable<void> {
    return Observable.create((observer: Observer<void>) => {
        fs.writeFile(filePath, data, (error) => {
            if (error) {
                observer.error(error);
            } else {
                observer.next(void 0);
                observer.complete();
            }
        });
    });
}

export function getFullPath(srcPath: string, filename: string): string {
    return path.join(srcPath, filename);
}

export function filePaths$(startingSourcePath: string, pattern: string, ignore: string | string[]): Observable<string[]> {
    return Observable.create((observer: Observer<string[]>) => {
        glob(
            pattern,
            {
                cwd: startingSourcePath,
                ignore,
                nodir: true
            },
            (error, matches) => {
            if (error) {
                observer.error(error);
            } else {
                const fullPaths = matches.map(filePath => getFullPath(startingSourcePath, filePath));
                observer.next(fullPaths);
                observer.complete();
            }
        });
    });
}