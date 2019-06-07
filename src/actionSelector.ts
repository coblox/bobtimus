import Big from "big.js";
import debug from "debug";
import { Action, Entity } from "../gen/siren";
import { Swap, toNominalUnit } from "./comitNode";
import { Config } from "./config";

const log = debug("bobtimus:actionSelector");

Big.DP = 30;

export class ActionSelector {
  private config: Config;
  private selectedActions: Action[];

  constructor(config: Config) {
    this.config = config;
    this.selectedActions = [];
  }

  public async selectActions(entity: Entity) {
    if (entity.class && entity.class.includes("swap")) {
      const swap = entity as Swap;

      return this.selectSwapAction(swap);
    }
    log("given entity is not a swap");
    return undefined;
  }

  private async selectSwapAction(swap: Swap) {
    const actions = swap.actions;
    if (!actions) {
      log("No action available");
      return undefined;
    }

    const acceptAction = actions.find(action => action.name === "accept");
    const declineAction = actions.find(action => action.name === "decline");
    const deployAction = actions.find(action => action.name === "deploy");
    const fundAction = actions.find(action => action.name === "fund");
    const redeemAction = actions.find(action => action.name === "redeem");
    const refundAction = actions.find(action => action.name === "refund");

    if (redeemAction && !this.wasReturned(redeemAction)) {
      this.selectedActions.push(redeemAction);
      return redeemAction;
    } else if (fundAction && !this.wasReturned(fundAction)) {
      this.selectedActions.push(fundAction);
      return fundAction;
    } else if (deployAction && !this.wasReturned(deployAction)) {
      this.selectedActions.push(deployAction);
      return deployAction;
    }

    if (acceptAction) {
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
        log(
          `Ledger-Asset not supported (${alphaLedger}:${alphaAsset}/${betaLedger}:${betaAsset})`
        );
      } else {
        const alphaQuantity = toNominalUnit(
          swap.properties.parameters.alpha_asset
        );
        const betaQuantity = toNominalUnit(
          swap.properties.parameters.beta_asset
        );

        if (!alphaQuantity || !betaQuantity) {
          log(
            `Internal Error: Asset not supported (${alphaAsset}: ${alphaQuantity}, ${betaAsset}: ${betaQuantity}).`
          );
        } else {
          // Bob always buys Alpha
          // Calculate rate as buy divided by sell
          const proposedRate = alphaQuantity.div(betaQuantity);
          const acceptableRate = this.config.getBuyDivBySellRate(
            alphaAsset,
            betaAsset
          );

          if (!acceptableRate) {
            log(
              `Rate is not configured to buy ${alphaLedger}:${alphaAsset} & sell ${betaLedger}:${betaAsset}`
            );
          } else {
            log(
              `Proposed rate: ${proposedRate.toFixed()}, Acceptable rate: ${acceptableRate.toFixed()}`
            );

            if (
              proposedRate.gte(acceptableRate) &&
              !this.wasReturned(acceptAction)
            ) {
              this.selectedActions.push(acceptAction);
              return acceptAction;
            } else if (declineAction && !this.wasReturned(declineAction)) {
              this.selectedActions.push(declineAction);
              return declineAction;
            } else {
              log("Decline action is unavailable");
            }
          }
        }
      }
    } else if (refundAction) {
      // Only refund action available, doing nothing for now
      log("not implemented");
    }

    return undefined;
  }

  private wasReturned(action: Action) {
    if (
      this.selectedActions.find(
        loggedAction => loggedAction.href === action.href
      )
    ) {
      log(`Cannot return action twice: ${JSON.stringify(action)}!`);
      return true;
    } else {
      return false;
    }
  }
}
