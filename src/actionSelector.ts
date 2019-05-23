import { Result } from "@badrap/result/dist";
import Big from "big.js";
import debug from "debug";
import { Action, Entity } from "../gen/siren";
import { Swap, toNominalUnit } from "./comitNode";
import { Config } from "./config";

const log = debug("bobtimus:actionSelector");

Big.DP = 30;

export class ActionSelector {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  public selectAction(entity: Entity): Result<Action, Error> {
    if (entity.class && entity.class.includes("swap")) {
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
    const deployAction = actions.find(action => action.name === "deploy");
    const fundAction = actions.find(action => action.name === "fund");
    const redeemAction = actions.find(action => action.name === "redeem");
    const refundAction = actions.find(action => action.name === "refund");

    if (redeemAction) {
      return Result.ok(redeemAction);
    } else if (fundAction) {
      return Result.ok(fundAction);
    } else if (deployAction) {
      return Result.ok(deployAction);
    } else if (acceptAction) {
      const alphaLedger = swap.properties.parameters.alpha_ledger.name;
      const betaLedger = swap.properties.parameters.beta_ledger.name;
      const alphaAsset = swap.properties.parameters.alpha_asset.name;
      const betaAsset = swap.properties.parameters.beta_asset.name;

      log(
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

      const alphaQuantity = toNominalUnit(
        swap.properties.parameters.alpha_asset
      );
      const betaQuantity = toNominalUnit(swap.properties.parameters.beta_asset);

      if (!alphaQuantity || !betaQuantity) {
        return Result.err(
          new Error(
            `Internal Error: Asset not supported (${alphaAsset}: ${alphaQuantity}, ${betaAsset}: ${betaQuantity}).`
          )
        );
      }

      // Bob always buys Alpha
      // Calculate rate as buy divided by sell
      const proposedRate = alphaQuantity.div(betaQuantity);
      const acceptableRate = this.config.getBuyDivBySellRate(
        alphaAsset,
        betaAsset
      );

      if (!acceptableRate) {
        return Result.err(
          new Error(
            `Rate is not configured to buy ${alphaLedger}:${alphaAsset} & sell ${betaLedger}:${betaAsset}`
          )
        );
      }

      log(
        `Proposed rate: ${proposedRate.toFixed()}, Acceptable rate: ${acceptableRate.toFixed()}`
      );

      if (proposedRate.gte(acceptableRate)) {
        return Result.ok(acceptAction);
      } else if (declineAction) {
        return Result.ok(declineAction);
      } else {
        return Result.err(new Error("Decline action is unavailable"));
      }
    } else if (refundAction) {
      // Only refund action available, doing nothing for now
      Result.err(new Error("not implemented"));
    }

    return Result.err(new Error("not implemented"));
  }
}
