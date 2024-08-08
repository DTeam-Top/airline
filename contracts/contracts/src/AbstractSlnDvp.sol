// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import {Signature} from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {ISlnDvp, FullEASOffChainAttestation, OffChainAttestation, EIP712Domain, OfferReceiver, IClaimable} from "./ISlnDvp.sol";
import {IEAS} from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import "hardhat/console.sol";

abstract contract AbstractSlnDvp is ISlnDvp, Ownable, EIP712 {
    address internal _easContractAddress;
    mapping(address => bool) internal _allowedAddresses;

    bytes32 private constant EIP712_TYPE_HASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    bytes32 private constant EAS_ATTEST_TYPEHASH =
        keccak256(
            "Attest(uint16 version,bytes32 schema,address recipient,uint64 time,uint64 expirationTime,bool revocable,bytes32 refUID,bytes data)"
        );

    constructor(address easContractAddress, string memory name, string memory version) Ownable() EIP712(name, version) {
        _easContractAddress = easContractAddress;
    }

    function setEasContractAddress(address easContractAddress) external onlyOwner {
        _easContractAddress = easContractAddress;
    }

    function setAllowedAddress(address addr, bool allowed) external onlyOwner {
        _allowedAddresses[addr] = allowed;
    }

    function isAllowedAddress(address addr) external view returns (bool) {
        return _allowedAddresses[addr];
    }

    function _preValidateOffer(FullEASOffChainAttestation memory offer) internal virtual;

    function _handleOffer(OffChainAttestation memory offerData, OfferReceiver memory offerReceiver) internal virtual;

    function perform(
        FullEASOffChainAttestation memory offer,
        FullEASOffChainAttestation memory id
    ) external payable override {
        _preValidateOffer(offer);

        address offerIssuer = verifyEASAttestation(offer.domain, offer.attestation, offer.signature);
        require(_allowedAddresses[offerIssuer], "Offer Attestation issuer is not allowed.");
        require(_isValid(offerIssuer, offer.attestation), "Offer attestation is expired or revoked by its issuer.");

        address idIssuer = verifyEASAttestation(id.domain, id.attestation, id.signature);
        require(_allowedAddresses[idIssuer], "ID attestation issuer is not allowed.");
        require(_isValid(idIssuer, id.attestation), "ID attestation is expired or revoked by its issuer.");

        (string memory idType, string memory idValue, address subject, ) = _decodeIdAttestation(id.attestation.data);

        _handleOffer(offer.attestation, OfferReceiver(idType, idValue, subject));

        emit Delivered(offer.attestation.uid, id.attestation.uid);
    }

    function verify(FullEASOffChainAttestation memory attestion) external view override returns (address, bool) {
        address issuer = verifyEASAttestation(attestion.domain, attestion.attestation, attestion.signature);
        return (issuer, _isValid(issuer, attestion.attestation));
    }

    function verifyId(
        FullEASOffChainAttestation memory idAttestation
    ) external view override returns (address, bool, string memory, string memory, address, string memory) {
        address issuer = verifyEASAttestation(idAttestation.domain, idAttestation.attestation, idAttestation.signature);
        bool isValid = _isValid(issuer, idAttestation.attestation);
        (string memory idType, string memory idValue, address subject, string memory scriptUri) = _decodeIdAttestation(
            idAttestation.attestation.data
        );
        return (issuer, isValid, idType, idValue, subject, scriptUri);
    }

    function verifyEASAttestation(
        EIP712Domain memory domain,
        OffChainAttestation memory offChainAttestation,
        Signature memory signature
    ) public pure returns (address) {
        bytes32 digest = ECDSA.toTypedDataHash(
            _buildDomainSeparator(domain),
            _buildOffchainAttestationStructHash(offChainAttestation)
        );
        address issuer = ECDSA.recover(digest, abi.encodePacked(signature.r, signature.s, signature.v));
        return issuer;
    }

    function _buildDomainSeparator(EIP712Domain memory domain) private pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    EIP712_TYPE_HASH,
                    keccak256(bytes(domain.name)),
                    keccak256(bytes(domain.version)),
                    domain.chainId,
                    domain.verifyingContract
                )
            );
    }

    function _buildOffchainAttestationStructHash(
        OffChainAttestation memory attestation
    ) private pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    EAS_ATTEST_TYPEHASH,
                    attestation.version,
                    attestation.schema,
                    attestation.recipient,
                    attestation.time,
                    attestation.expirationTime,
                    attestation.revocable,
                    attestation.refUID,
                    keccak256(attestation.data)
                )
            );
    }

    function _isValid(address issuer, OffChainAttestation memory attestation) private view returns (bool) {
        bool isValid = block.timestamp > attestation.time &&
            (attestation.expirationTime == 0 || block.timestamp < attestation.expirationTime);

        if (attestation.revocable && isValid) {
            IEAS eas = IEAS(_easContractAddress);
            uint64 revokedAt = eas.getRevokeOffchain(issuer, attestation.uid);
            isValid = (revokedAt == 0);
        }
        return isValid;
    }

    function _decodeIdAttestation(
        bytes memory data
    ) private pure returns (string memory idType, string memory id, address subject, string memory scriptUri) {
        return abi.decode(data, (string, string, address, string));
    }
}
