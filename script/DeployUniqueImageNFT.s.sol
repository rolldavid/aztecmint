// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {UniqueImageNFT} from "../contracts/UniqueImageNFT.sol";

contract DeployUniqueImageNFT is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();
        new UniqueImageNFT();
        vm.stopBroadcast();
    }
} 