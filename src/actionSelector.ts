import Big from "big.js";
import { getLogger } from "log4js";
import { Action, Entity } from "../gen/siren";
import Asset, { toAsset, toNominalUnit } from "./asset";
import { Swap } from "./comitNode";
import Ledger, { toLedger } from "./ledger";
import { Offer } from "./rates/tradeService";

const logger = getLogger();

type CreateAssetFromTokens = (
  ledger: Ledger,
  contractAddress: string
) => Asset | undefined;

Big.DP = 30;

export class ActionSelector {
  private readonly supportedLedgers: Ledger[];
  private readonly createAssetFromTokens: CreateAssetFromTokens;
  private selectedActions: Action[];
  private readonly isOfferAcceptable: (offer: Offer) => Promise<boolean>;

  constructor(
    supportedLedgers: Ledger[],
    isOfferAcceptable: (offer: Offer) => Promise<boolean>,
    createAssetFromTokens?: CreateAssetFromTokens
  ) {
    this.supportedLedgers = supportedLedgers;
    this.isOfferAcceptable = isOfferAcceptable;
    this.selectedActions = [];
    if (createAssetFromTokens) {
      this.createAssetFromTokens = createAssetFromTokens;
    } else {
      this.createAssetFromTokens = () => undefined;
    }
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
      if (await this.isAcceptable(swap)) {
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

  private isAcceptable(swap: Swap): Promise<boolean> {
    const alphaLedger = toLedger(swap.properties.parameters.alpha_ledger.name);
    const betaLedger = toLedger(swap.properties.parameters.beta_ledger.name);
    if (!alphaLedger || !betaLedger) {
      logger.error("Ledger is not supported");
      return Promise.resolve(false);
    }
    const alphaAsset = toAsset(
      swap.properties.parameters.alpha_asset,
      alphaLedger,
      this.createAssetFromTokens
    );
    const betaAsset = toAsset(
      swap.properties.parameters.beta_asset,
      betaLedger,
      this.createAssetFromTokens
    );
    if (!alphaAsset || !betaAsset) {
      logger.error("Asset is not supported");
      return Promise.resolve(false);
    }
    if (
      !this.supportedLedgers.includes(alphaLedger) ||
      !this.supportedLedgers.includes(betaLedger)
    ) {
      return Promise.resolve(false);
    }
    const protocol = swap.properties.protocol;

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
    const offer: Offer = {
      timestamp: new Date(),
      buy: {
        asset: alphaAsset,
        ledger: alphaLedger,
        quantity: alphaNominalAmount
      },
      sell: {
        asset: betaAsset,
        ledger: betaLedger,
        quantity: betaNominalAmount
      },
      protocol
    };
    return this.isOfferAcceptable(offer);
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
