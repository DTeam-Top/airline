// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {IClaimable} from "./ISlnDvp.sol";

contract TestERC721 is ERC721Enumerable, Ownable, IClaimable {
    // id attestation ID -> claimed count
    mapping(string => uint) public claimedById;

    // attestation uid -> claimed count
    mapping(bytes32 => uint) public claimedByUid;

    uint public claimed;

    uint public totalClaimable;

    uint public constant MAX_CLAIM = 1;

    constructor(string memory name, string memory symbol, uint256 _totalClaimable) Ownable() ERC721(name, symbol) {
        totalClaimable = _totalClaimable;
    }

    function claim(bytes32 uid, string calldata id, address to) public {
        require(1 + claimed <= totalClaimable, "Exceeded total claimable");
        require(claimedById[id] + 1 <= MAX_CLAIM, "Exceeded maximum claims for the ID");

        claimedById[id] += 1;
        claimedByUid[uid] += 1;
        claimed += 1;

        _mint(to, totalSupply());
    }

    function bulkMint(address to, uint256 count) public onlyOwner {
        for (uint256 i = 0; i < count; i++) {
            _mint(to, totalSupply());
        }
    }

    function setTotalClaimable(uint256 _totalClaimable) public onlyOwner {
        totalClaimable = _totalClaimable;
    }

    function resetClaimed() public onlyOwner {
        claimed = 0;
    }

    function resetClaimedById(string calldata id) public onlyOwner {
        claimedById[id] = 0;
    }
}
