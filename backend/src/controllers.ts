import {
  createIdAttestAction,
  createSellingOffer,
  getAttestationRawdata,
} from "./actions/attestationAction";

import { Controller, SecurityFilterRule } from "./_core/type";

export const controllers: Controller[] = [
  {
    prefix: "attestations",
    actions: [createSellingOffer, createIdAttestAction, getAttestationRawdata],
  },
];

export const securityRules: SecurityFilterRule[] = [
  { pattern: /^\/attestations/ },
];
