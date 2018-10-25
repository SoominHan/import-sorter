import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';
import { Observable, Observer } from 'rxjs';

export function readFile$(path: string, encoding: string = 'utf-8'): Observable<string> {
    return Observable.create((observer: Observer<string>) => {
        fs.readFile(path, encoding, (error, data) => {
            if (error) {
                observer.error(error);
            } else {
                observer.next(data);
                observer.complete();
            }
        });
    });
}

export function writeFile$(path: string, data: string): Observable<void> {
    return Observable.create((observer: Observer<void>) => {
        fs.writeFile(path, data, (error) => {
            if (error) {
                observer.error(error);
            } else {
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

// export function getFiles(srcPath: string, pattern: string, ignore: string | string[]): Promise<string[]> {
//     const results = new Promise<string[]>((resolve, reject) => {
//         glob(
//             pattern,
//             {
//                 cwd: srcPath,
//                 ignore,
//                 nodir: true
//             },
//             (error, matches) => error ? reject(error) : resolve(matches)
//         );
//     });
//     return results.then(filePaths => filePaths.map(filePath => getFullPath(srcPath, filePath)));
// }

// export function readFile(filePath: string, encoding: string = 'utf-8'): Promise<string> {
//     return new Promise<string>((resolve, reject) => {
//         fs.readFile(filePath, encoding, (error, data) => error ? reject(error) : resolve(data));
//     });
// }

// export function writeFile(filePath: string, data: string): Promise<void> {
//     return new Promise<void>((resolve, reject) => {
//         fs.writeFile(filePath, data, (error) => error ? reject(error) : resolve());
//     });
// }