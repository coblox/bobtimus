import { Result } from "@badrap/result/dist";
import Big from "big.js";
import { Action } from "../gen/siren";
import { Swap } from "./comit_node";
import config from "./config";

Big.DP = 30;

export function selectAction(swap: Swap): Result<Action, Error> {
  const actions = swap.actions;
  if (!actions) {
    return Result.err(new Error("No action available"));
  }

  const acceptAction = actions.find(action => action.name === "accept");
  const declineAction = actions.find(action => action.name === "decline");

  if (acceptAction) {
    const alphaAsset = new Big(swap.properties.parameters.alpha_asset.quantity);
    const betaAsset = new Big(swap.properties.parameters.beta_asset.quantity);
    // Bob always buys Alpha
    // Calculate rate as alpha / beta
    const proposedRate = alphaAsset.div(betaAsset);

    const acceptableRate = new Big(config.ethBtc.rate.alpha).div(
      new Big(config.ethBtc.rate.beta)
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
