import {fileURLToPath} from "url";
import * as path from "path";

export function __filename__dirname(import_meta_url: string) {
  const filename = fileURLToPath(import_meta_url);
  return {
    __filename: filename,
    __dirname: path.dirname(filename)
  };
}
