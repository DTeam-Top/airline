// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AbstractSlnDvp, OfferReceiver, OffChainAttestation, FullEASOffChainAttestation} from "./AbstractSlnDvp.sol";
import {IEAS} from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";

struct SellingOffer {
    address token;
    uint id;
    string receiverIdType;
    string receiver;
    address erc20;
    uint price;
}

contract SlnTokenSellingDvp is AbstractSlnDvp {
    mapping(bytes32 => bool) internal _usedOffers;

    bytes32 private constant SELLING_OFFER_TYPEHASH =
        keccak256("Offer(address token,uint256 id,string receiverIdType,string receiver,address erc20,uint256 price)");

    constructor(
        address easContractAddress,
        string memory name,
        string memory version
    ) AbstractSlnDvp(easContractAddress, name, version) {}

    function _preValidateOffer(FullEASOffChainAttestation memory offer) internal override {
        require(!_usedOffers[offer.attestation.uid], "Offer has already been used.");
        _usedOffers[offer.attestation.uid] = true;
    }

    function _handleOffer(OffChainAttestation memory offerData, OfferReceiver memory offerReceiver) internal override {
        (
            address token,
            uint tokenId,
            string memory receiverIdType,
            string memory receiver,
            address erc20,
            uint price,
            bytes memory sellerSignature,

        ) = _decodeOfferAttestation(offerData.data);

        address seller = verifySellingOffer(
            SellingOffer(token, tokenId, receiverIdType, receiver, erc20, price),
            sellerSignature
        );
        require(IERC721(token).ownerOf(tokenId) == seller, "This seller does not hold the token.");

        require(keccak256(bytes(offerReceiver.idType)) == keccak256(bytes(receiverIdType)), "ID type mismatch");
        require(keccak256(bytes(offerReceiver.idValue)) == keccak256(bytes(receiver)), "ID value mismatch");

        IERC721(token).transferFrom(seller, offerReceiver.subject, tokenId);

        if (erc20 == address(0)) {
            require(msg.value == price, "Wrong amount of ETH sent");

            (bool success, ) = seller.call{value: price}("");
            require(success, "Problem with payment");
        } else {
            SafeERC20.safeTransferFrom(IERC20(erc20), offerReceiver.subject, seller, price);
        }
    }

    function verifySellingOffer(
        SellingOffer memory sellingOffer,
        bytes memory signature
    ) public view returns (address) {
        bytes32 digest = _hashTypedDataV4(_buildSellingOfferStructHash(sellingOffer));
        address signer = ECDSA.recover(digest, signature);
        return signer;
    }

    function _buildSellingOfferStructHash(SellingOffer memory sellingOffer) private pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    SELLING_OFFER_TYPEHASH,
                    sellingOffer.token,
                    sellingOffer.id,
                    keccak256(bytes(sellingOffer.receiverIdType)),
                    keccak256(bytes(sellingOffer.receiver)),
                    sellingOffer.erc20,
                    sellingOffer.price
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
            uint id,
            string memory receiverIdType,
            string memory receiver,
            address erc20,
            uint price,
            bytes memory sellerSignature,
            string memory scriptURI
        )
    {
        return abi.decode(data, (address, uint, string, string, address, uint, bytes, string));
    }
}
