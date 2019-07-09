import Big from "big.js";
import { getLogger } from "log4js";
import { Action, Entity } from "../gen/siren";
import { toAsset, toNominalUnit } from "./asset";
import { Swap } from "./comitNode";
import { Config } from "./config";
import { toLedger } from "./ledger";
import { TradeEvaluationService } from "./rates/tradeEvaluationService";

const logger = getLogger();

Big.DP = 30;

export class ActionSelector {
  private config: Config;
  private selectedActions: Action[];
  private rates: TradeEvaluationService;

  constructor(config: Config, rates: TradeEvaluationService) {
    this.config = config;
    this.selectedActions = [];
    this.rates = rates;
  }

  public selectActions(entity: Entity) {
    if (entity.class && entity.class.includes("swap")) {
      const swap = entity as Swap;

      return this.selectSwapAction(swap);
    }
    logger.error(`The given entity is not a swap; entity ${entity}`);
    return undefined;
  }

  private async selectSwapAction(swap: Swap) {
    const actions = swap.actions;
    if (!actions) {
      logger.debug("No action available");
      return undefined;
    }

    const acceptAction = actions.find(action => action.name === "accept");
    const declineAction = actions.find(action => action.name === "decline");
    const deployAction = actions.find(action => action.name === "deploy");
    const fundAction = actions.find(action => action.name === "fund");
    const redeemAction = actions.find(action => action.name === "redeem");
    const refundAction = actions.find(action => action.name === "refund");

    if (refundAction && !this.wasReturned(refundAction)) {
      this.selectedActions.push(refundAction);
      return refundAction;
    } else if (redeemAction && !this.wasReturned(redeemAction)) {
      this.selectedActions.push(redeemAction);
      return redeemAction;
    } else if (fundAction && !this.wasReturned(fundAction)) {
      this.selectedActions.push(fundAction);
      return fundAction;
    } else if (deployAction && !this.wasReturned(deployAction)) {
      this.selectedActions.push(deployAction);
      return deployAction;
    }

    if (acceptAction && !this.wasReturned(acceptAction)) {
      if (await this.shouldSelectAccept(swap)) {
        this.selectedActions.push(acceptAction);
        return acceptAction;
      } else if (declineAction && !this.wasReturned(declineAction)) {
        this.selectedActions.push(declineAction);
        return declineAction;
      } else {
        logger.error("Decline action is unavailable");
      }
    } else if (refundAction) {
      // Only refund action available, doing nothing for now
      logger.warn("refund is not implemented");
    }

    return undefined;
  }

  private shouldSelectAccept(swap: Swap): Promise<boolean> {
    const alphaLedger = toLedger(swap.properties.parameters.alpha_ledger.name);
    const betaLedger = toLedger(swap.properties.parameters.beta_ledger.name);
    const alphaAsset = toAsset(swap.properties.parameters.alpha_asset.name);
    const betaAsset = toAsset(swap.properties.parameters.beta_asset.name);

    if (!alphaAsset || !betaAsset || !alphaLedger || !betaLedger) {
      return Promise.resolve(false);
    }

    if (
      !this.config.isSupportedAndConfigured(alphaLedger) ||
      !this.config.isSupportedAndConfigured(betaLedger)
    ) {
      return Promise.resolve(false);
    }

    const alphaNominalAmount = toNominalUnit(
      alphaAsset,
      new Big(swap.properties.parameters.alpha_asset.quantity)
    );
    const betaNominalAmount = toNominalUnit(
      betaAsset,
      new Big(swap.properties.parameters.beta_asset.quantity)
    );

    if (!alphaNominalAmount || !betaNominalAmount) {
      return Promise.resolve(false);
    }

    // Bob always buys Alpha
    const tradeAmounts = {
      buyAsset: alphaAsset,
      sellAsset: betaAsset,
      buyNominalAmount: alphaNominalAmount,
      sellNominalAmount: betaNominalAmount
    };

    return this.rates.isTradeAcceptable(tradeAmounts);
  }

  private wasReturned(action: Action) {
    if (
      this.selectedActions.find(
        loggedAction => loggedAction.href === action.href
      )
    ) {
      logger.debug(`Cannot return action twice: ${JSON.stringify(action)}!`);
      return true;
    } else {
      return false;
    }
  }
}
