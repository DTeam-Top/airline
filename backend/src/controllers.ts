import {
  createIdAttestationAction,
  getAttestation,
  getAttestationByDecoded,
  getAttestationRawdata,
  getIdAttestationsStatus,
  getIssuersByRecipient,
  listAttestations,
  listIdAttestations,
  uploadingAttestation,
} from './actions/attestationAction';
import {createOtp} from './actions/secretAction';
import {Controller, SecurityFilterRule} from './_core/type';

export const controllers: Controller[] = [
  {
    prefix: 'attestations',
    actions: [
      getAttestation,
      listAttestations,
      uploadingAttestation,
      getAttestationByDecoded,
      createIdAttestationAction,
      getIssuersByRecipient,
      listIdAttestations,
      getIdAttestationsStatus,
      getAttestationRawdata,
    ],
  },
  {
    prefix: "offers",
    actions: [
      createSellingOffer,
      createClaimingOffer,
      createDelivery,
      createIdAttestAction,
      getAttestationRawdata,
    ],
  },
  {
    prefix: 'secret',
    actions: [createOtp],
  },
];

export const securityRules: SecurityFilterRule[] = [];
