// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {UniqueImageNFT} from "../contracts/UniqueImageNFT.sol";

contract DeploySepolia is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        UniqueImageNFT nft = new UniqueImageNFT();
        
        vm.stopBroadcast();
        
        console.log("UniqueImageNFT deployed to:", address(nft));
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
    }
} 