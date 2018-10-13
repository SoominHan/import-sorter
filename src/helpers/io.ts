import * as fs from 'fs';
import * as glob from 'glob';
import * as path from 'path';

export function getFullPath(srcPath: string, filename: string) {
  return path.join(srcPath, filename);
}

export function getFiles(srcPath: string, pattern: string, ignore: string | string[]): Promise<string[]> {
  const results = new Promise<string[]>((resolve, reject) => {
    glob(
      pattern,
      {
        cwd: srcPath,
        ignore,
        nodir: true
      },
      (error, matches) => error ? reject(error) : resolve(matches)
    );
  });
  return results.then(filePaths => filePaths.map(filePath => getFullPath(srcPath, filePath)));
}

export function exists(filePath: string) {
  return fs.existsSync(filePath);
}

export function writeFile(outPath: string, output: string) {
  return fs.writeFileSync(outPath, output);
}