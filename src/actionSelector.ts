import { Result } from "@badrap/result/dist";
import Big from "big.js";
import debug from "debug";
import { Action, Entity } from "../gen/siren";
import { contains, Swap } from "./comitNode";
import { Config } from "./config";

const dbg = debug("bobtimus:dbg:actionSelector");

Big.DP = 30;

export class ActionSelector {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  public selectAction(entity: Entity): Result<Action, Error> {
    if (entity.class && contains(entity.class, "swap")) {
      const swap = entity as Swap;

      return this.selectSwapAction(swap);
    }
    return Result.err(new Error("Given entity is not a swap"));
  }

  private selectSwapAction(swap: Swap): Result<Action, Error> {
    const actions = swap.actions;
    if (!actions) {
      return Result.err(new Error("No action available"));
    }

    const acceptAction = actions.find(action => action.name === "accept");
    const declineAction = actions.find(action => action.name === "decline");

    if (acceptAction) {
      const alphaLedger = swap.properties.parameters.alpha_ledger.name;
      const betaLedger = swap.properties.parameters.beta_ledger.name;
      const alphaAsset = swap.properties.parameters.alpha_asset.name;
      const betaAsset = swap.properties.parameters.beta_asset.name;

      dbg(
        `selection Action for ${alphaLedger}-${alphaAsset}/${betaLedger}-${betaAsset}`
      );

      if (
        !this.config.isSupported(alphaLedger, alphaAsset) ||
        !this.config.isSupported(betaLedger, betaAsset)
      ) {
        return Result.err(
          new Error(
            `Ledger-Asset not supported (${alphaLedger}:${alphaAsset}/${betaLedger}:${betaAsset})`
          )
        );
      }

      const alphaQuantity = new Big(
        swap.properties.parameters.alpha_asset.quantity
      );
      const betaQuantity = new Big(
        swap.properties.parameters.beta_asset.quantity
      );
      // Bob always buys Alpha
      // Calculate rate as alpha / beta
      const proposedRate = alphaQuantity.div(betaQuantity);

      const acceptableRate = this.config.getRate(
        alphaLedger,
        alphaAsset,
        betaLedger,
        betaAsset
      );

      if (!acceptableRate) {
        return Result.err(
          new Error(
            `Rate is not configured to buy ${alphaLedger}:${alphaAsset} & sell ${betaLedger}:${betaAsset}`
          )
        );
      }

      dbg(
        `Proposed rate: ${proposedRate.toFixed()}, Acceptable rate: ${acceptableRate.toFixed()}`
      );

      if (proposedRate.gte(acceptableRate)) {
        return Result.ok(acceptAction);
      } else if (declineAction) {
        return Result.ok(declineAction);
      } else {
        return Result.err(new Error("Decline action is unavailable"));
      }
    }

    return Result.err(new Error("not implemented"));
  }
}
