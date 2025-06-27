// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract UniqueImageNFT is ERC721URIStorage {
    uint256 public tokenCounter;

    constructor() ERC721("UniqueImageNFT", "UINFT") {
        tokenCounter = 0;
    }

    function mintNFT(address to, string memory tokenURI) public returns (uint256) {
        uint256 newTokenId = tokenCounter;
        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        tokenCounter += 1;
        return newTokenId;
    }
} 