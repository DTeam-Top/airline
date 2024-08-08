// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import {Attestation, Signature} from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";

struct EIP712Domain {
    string name;
    string version;
    uint256 chainId;
    address verifyingContract;
}

struct OffChainAttestation {
    bytes32 uid;
    uint16 version;
    bytes32 schema;
    address recipient;
    uint64 time;
    uint64 expirationTime;
    bytes32 refUID;
    bool revocable;
    bytes data;
}

struct FullEASOffChainAttestation {
    EIP712Domain domain;
    OffChainAttestation attestation;
    Signature signature;
}

struct OfferReceiver {
    string idType;
    string idValue;
    address subject;
}

interface ISlnDvp {
    event Delivered(bytes32 indexed offerUid, bytes32 indexed idUid);

    function perform(FullEASOffChainAttestation memory offer, FullEASOffChainAttestation memory id) external payable;

    function verify(FullEASOffChainAttestation memory attestion) external view returns (address, bool);

    function verifyId(
        FullEASOffChainAttestation memory idAttestation
    )
        external
        view
        returns (address, bool, string memory idType, string memory id, address subject, string memory scriptUri);
}

interface IClaimable {
    function claim(bytes32 uid, string calldata id, address to) external;

    function claimedById(string calldata id) external view returns (uint);

    function claimedByUid(bytes32 uid) external view returns (uint);

    function claimed() external view returns (uint);

    function totalClaimable() external view returns (uint);

    function setTotalClaimable(uint256 _totalClaimable) external;
}
