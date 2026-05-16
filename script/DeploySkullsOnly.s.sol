// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HashSkulls} from "../src/HashSkulls.sol";
import {HashSkullsWrapper} from "../src/HashSkullsWrapper.sol";
import {HashSkullsMarket} from "../src/HashSkullsMarket.sol";

contract DeploySkullsOnly is Script {
    address constant RENDERER = 0xA23353eF8d2951aeD528627771C74069a00005Ca;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");

        console.log("Deployer:", vm.addr(pk));
        console.log("Balance (wei):", vm.addr(pk).balance);
        console.log("Reusing renderer:", RENDERER);

        vm.startBroadcast(pk);

        HashSkulls skulls = new HashSkulls(RENDERER);
        HashSkullsWrapper wrapper = new HashSkullsWrapper(address(skulls));
        HashSkullsMarket market = new HashSkullsMarket(address(skulls));

        vm.stopBroadcast();

        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("HashSkulls:       ", address(skulls));
        console.log("HashSkullsWrapper:", address(wrapper));
        console.log("HashSkullsMarket: ", address(market));
        console.log("Mint price:", skulls.MINT_PRICE());
    }
}
