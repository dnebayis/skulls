// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HashSkulls} from "../src/HashSkulls.sol";
import {HashSkullsRenderer} from "../src/HashSkullsRenderer.sol";
import {HashSkullsWrapper} from "../src/HashSkullsWrapper.sol";
import {HashSkullsMarket} from "../src/HashSkullsMarket.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        console.log("Deployer:", deployer);
        console.log("Balance (wei):", deployer.balance);

        vm.startBroadcast(pk);

        HashSkullsRenderer renderer = new HashSkullsRenderer();
        HashSkulls skulls = new HashSkulls(address(renderer));
        HashSkullsWrapper wrapper = new HashSkullsWrapper(address(skulls));
        HashSkullsMarket market = new HashSkullsMarket(address(skulls));

        vm.stopBroadcast();

        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("HashSkullsRenderer:", address(renderer));
        console.log("HashSkulls:        ", address(skulls));
        console.log("HashSkullsWrapper: ", address(wrapper));
        console.log("HashSkullsMarket:  ", address(market));
        console.log("");
        console.log("Mint price:", skulls.MINT_PRICE());
        console.log("Max supply:", skulls.MAX_SUPPLY());
        console.log("Max per wallet:", skulls.MAX_PER_WALLET());
        console.log("Market active listings:", market.activeListingCount());
    }
}
