import Big from "big.js";
import debug from "debug";
import { Observable, Subscriber } from "rxjs";
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

  public selectActions(entity: Entity): Observable<Action> {
    return new Observable(observer => {
      if (entity.class && entity.class.includes("swap")) {
        const swap = entity as Swap;

        this.selectSwapAction(swap, observer);
      }
      observer.error("given entity is not a swap");
    });
  }

  private selectSwapAction(swap: Swap, observer: Subscriber<Action>) {
    const actions = swap.actions;
    if (!actions) {
      observer.error("No action available");
      observer.complete();
    }

    const acceptAction = actions.find(action => action.name === "accept");
    const declineAction = actions.find(action => action.name === "decline");
    const deployAction = actions.find(action => action.name === "deploy");
    const fundAction = actions.find(action => action.name === "fund");
    const redeemAction = actions.find(action => action.name === "redeem");
    const refundAction = actions.find(action => action.name === "refund");

    if (redeemAction) {
      observer.next(redeemAction);
    }
    if (fundAction) {
      observer.next(fundAction);
    }
    if (deployAction) {
      observer.next(deployAction);
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
        observer.error(
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
          observer.error(
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
            observer.error(
              `Rate is not configured to buy ${alphaLedger}:${alphaAsset} & sell ${betaLedger}:${betaAsset}`
            );
          } else {
            log(
              `Proposed rate: ${proposedRate.toFixed()}, Acceptable rate: ${acceptableRate.toFixed()}`
            );

            if (proposedRate.gte(acceptableRate)) {
              observer.next(acceptAction);
            } else if (declineAction) {
              observer.next(declineAction);
            } else {
              observer.error("Decline action is unavailable");
            }
          }
        }
      }
    } else if (refundAction) {
      // Only refund action available, doing nothing for now
      observer.error("not implemented");
    }

    observer.complete();
  }
}
