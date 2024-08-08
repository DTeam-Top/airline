// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AbstractSlnDvp, OfferReceiver, OffChainAttestation, FullEASOffChainAttestation} from "./AbstractSlnDvp.sol";
import {IEAS} from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";
import {IClaimable} from "./ISlnDvp.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

struct ClaimingOffer {
    address token;
    uint amount;
    string receiverIdType;
    address erc20;
    uint price;
}

contract SlnTokenClaimingDvp is AbstractSlnDvp {
    bytes32 private constant CLAIMING_OFFER_TYPEHASH =
        keccak256("Offer(address token,uint256 amount,string receiverIdType,address erc20,uint256 price)");

    constructor(
        address easContractAddress,
        string memory name,
        string memory version
    ) AbstractSlnDvp(easContractAddress, name, version) {}

    function _preValidateOffer(FullEASOffChainAttestation memory offer) internal override {}

    function _handleOffer(OffChainAttestation memory offerData, OfferReceiver memory offerReceiver) internal override {
        (
            address token,
            uint amount,
            string memory receiverIdType,
            address erc20,
            uint price,
            bytes memory sellerSignature,

        ) = _decodeOfferAttestation(offerData.data);

        address seller = verifyClaimingOffer(
            ClaimingOffer(token, amount, receiverIdType, erc20, price),
            sellerSignature
        );

        IClaimable tokenContract = IClaimable(token);

        require(tokenContract.claimed() < tokenContract.totalClaimable(), "Exceeded total claims");
        require(seller == Ownable(token).owner(), "Invalid seller");
        require(keccak256(bytes(offerReceiver.idType)) == keccak256(bytes(receiverIdType)), "ID type mismatch");
        require(tokenContract.claimedByUid(offerData.uid) < amount, "Exceeded maximum claims for the attestation");

        if (price == 0) {
            require(
                tokenContract.claimedById(offerReceiver.idValue) < 1,
                "Exceeded maximum free claims for the account"
            );
        }

        tokenContract.claim(offerData.uid, offerReceiver.idValue, offerReceiver.subject);

        if (price == 0) {
            return;
        }

        if (erc20 == address(0)) {
            require(msg.value == price, "Wrong amount of ETH sent");

            (bool success, ) = seller.call{value: price}("");
            require(success, "Problem with payment");
        } else {
            SafeERC20.safeTransferFrom(IERC20(erc20), offerReceiver.subject, seller, price);
        }
    }

    function verifyClaimingOffer(
        ClaimingOffer memory claimingOffer,
        bytes memory signature
    ) public view returns (address) {
        bytes32 digest = _hashTypedDataV4(_buildClaimingOfferStructHash(claimingOffer));
        address signer = ECDSA.recover(digest, signature);
        return signer;
    }

    function _buildClaimingOfferStructHash(ClaimingOffer memory claimingOffer) private pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    CLAIMING_OFFER_TYPEHASH,
                    claimingOffer.token,
                    claimingOffer.amount,
                    keccak256(bytes(claimingOffer.receiverIdType)),
                    claimingOffer.erc20,
                    claimingOffer.price
                )
            );
    }

    function _decodeOfferAttestation(
        bytes memory data
    )
        private
        pure
        returns (
            address token,
            uint amount,
            string memory receiverIdType,
            address erc20,
            uint price,
            bytes memory sellerSignature,
            string memory scriptURI
        )
    {
        return abi.decode(data, (address, uint, string, address, uint, bytes, string));
    }
}
