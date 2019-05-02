import * as fs from "fs";
import * as toml from "toml";

export interface SwapConfig {
  rate: {
    alpha: string;
    beta: string;
  };
}

interface TomlConfig {
  comitNodeUrl: string;
  ethBtc: SwapConfig;
}

export class Config implements TomlConfig {
  public comitNodeUrl: string;
  public ethBtc: SwapConfig;

  constructor(filePath: string = "./config.toml") {
    const config = toml.parse(fs.readFileSync(filePath, "utf8")) as TomlConfig;

    this.ethBtc = config.ethBtc;

    if (!config.comitNodeUrl) {
      throw new Error("comitNodeUrl must be present in the config file");
    } else {
      this.comitNodeUrl = config.comitNodeUrl;
    }
  }

  public prependUrlIfNeeded(path: string): string {
    if (path.startsWith("/")) {
      return this.comitNodeUrl + path;
    }
    return path;
  }
}

const config: Config = new Config();
export default config;
