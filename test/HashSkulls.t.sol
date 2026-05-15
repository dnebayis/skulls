// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {HashSkulls} from "../src/HashSkulls.sol";
import {HashSkullsRenderer} from "../src/HashSkullsRenderer.sol";
import {HashSkullsWrapper} from "../src/HashSkullsWrapper.sol";
import {HashSkullsMarket} from "../src/HashSkullsMarket.sol";

contract HashSkullsTest is Test {
    HashSkulls         public skulls;
    HashSkullsRenderer public skullRenderer;
    HashSkullsWrapper  public wrapper;
    HashSkullsMarket   public market;

    receive() external payable {}

    address alice = makeAddr("alice");
    address bob   = makeAddr("bob");
    address carol = makeAddr("carol");

    uint256 price;

    function setUp() public {
        skullRenderer = new HashSkullsRenderer();
        skulls  = new HashSkulls(address(skullRenderer));
        wrapper = new HashSkullsWrapper(address(skulls));
        market  = new HashSkullsMarket(address(skulls));
        price   = skulls.MINT_PRICE();
        vm.deal(alice, 10 ether);
        vm.deal(bob,   10 ether);
        vm.deal(carol, 10 ether);
    }

    // -------------------------------------------------------------------------
    // Mint
    // -------------------------------------------------------------------------

    function test_constants() public view {
        assertEq(skulls.MAX_SUPPLY(), 10_000);
        assertEq(skulls.MAX_PER_WALLET(), 3);
        assertEq(skulls.MINT_PRICE(), 225_000_000_000_000);
    }

    function test_mint() public {
        vm.prank(alice);
        uint256 id = skulls.mint{value: price}();
        assertEq(id, 1);
        assertEq(skulls.ownerOf(1), alice);
        assertEq(skulls.totalSupply(), 1);
        assertEq(skulls.mintCount(alice), 1);
        assertEq(skulls.balanceOf(alice), 1);
        assertEq(skulls.tokenOfOwnerByIndex(alice, 0), 1);
        uint256[] memory ids = skulls.tokensOfOwner(alice);
        assertEq(ids.length, 1);
        assertEq(ids[0], 1);
    }

    function test_contractMintOpenToAnyEOA() public {
        address stranger = makeAddr("stranger");
        vm.deal(stranger, price);

        vm.prank(stranger);
        uint256 id = skulls.mint{value: price}();

        assertEq(id, 1);
        assertEq(skulls.ownerOf(id), stranger);
        assertEq(skulls.mintCount(stranger), 1);
    }

    function test_mint_perWalletLimit() public {
        vm.startPrank(alice);
        skulls.mint{value: price}();
        skulls.mint{value: price}();
        skulls.mint{value: price}();
        vm.stopPrank();

        assertEq(skulls.mintCount(alice), 3);

        vm.prank(alice);
        vm.expectRevert(HashSkulls.MintLimitReached.selector);
        skulls.mint{value: price}();
    }

    function test_mintMany() public {
        vm.prank(alice);
        uint256[] memory ids = skulls.mintMany{value: price * 3}(3);

        assertEq(ids.length, 3);
        assertEq(ids[0], 1);
        assertEq(ids[1], 2);
        assertEq(ids[2], 3);
        assertEq(skulls.balanceOf(alice), 3);
        assertEq(skulls.mintCount(alice), 3);

        uint256[] memory ownedIds = skulls.tokensOfOwner(alice);
        assertEq(ownedIds.length, 3);
        assertEq(ownedIds[0], 1);
        assertEq(ownedIds[1], 2);
        assertEq(ownedIds[2], 3);
    }

    function test_mintsRemaining() public {
        assertEq(skulls.mintsRemaining(alice), 3);

        vm.prank(alice);
        skulls.mint{value: price}();
        assertEq(skulls.mintsRemaining(alice), 2);

        vm.startPrank(alice);
        skulls.mint{value: price}();
        skulls.mint{value: price}();
        vm.stopPrank();
        assertEq(skulls.mintsRemaining(alice), 0);
    }

    function test_mintReverts_lowValue() public {
        vm.prank(alice);
        vm.expectRevert(HashSkulls.InsufficientPayment.selector);
        skulls.mint{value: 0}();
    }

    function test_mintReverts_overpayRefund() public {
        // ETH accumulates in contract, overpayment stays too
        uint256 balBefore = address(skulls).balance;
        vm.prank(alice);
        skulls.mint{value: price * 2}(); // double overpay
        // Contract holds the full msg.value (no refund in mint — caller overpaid)
        assertGe(address(skulls).balance, balBefore + price);
    }

    function test_ethAccumulatesInContract() public {
        vm.prank(alice);
        skulls.mint{value: price}();
        assertEq(address(skulls).balance, price);
    }

    // -------------------------------------------------------------------------
    // Withdraw (pull payment)
    // -------------------------------------------------------------------------

    function test_withdraw() public {
        vm.prank(alice);
        skulls.mint{value: price}();

        address dep = skulls.deployer();
        uint256 before = dep.balance;
        skulls.withdraw(); // called by deployer (test contract is deployer)
        assertEq(dep.balance, before + price);
        assertEq(address(skulls).balance, 0);
    }

    function test_withdraw_notDeployer() public {
        vm.prank(alice);
        skulls.mint{value: price}();

        vm.prank(alice);
        vm.expectRevert(HashSkulls.NotOwner.selector);
        skulls.withdraw();
    }

    function test_withdraw_nothingToWithdraw() public {
        vm.expectRevert(HashSkulls.NothingToWithdraw.selector);
        skulls.withdraw();
    }

    // -------------------------------------------------------------------------
    // Token URI & Traits
    // -------------------------------------------------------------------------

    function test_tokenURI_returns_data_uri() public {
        vm.prank(alice);
        skulls.mint{value: price}();
        string memory uri = skulls.tokenURI(1);
        assertTrue(_startsWith(uri, "data:application/json;base64,"));
        console.log("tokenURI length:", bytes(uri).length);
    }

    function test_traits_different_per_mint() public {
        vm.prank(alice);
        skulls.mint{value: price}();
        vm.prank(bob);
        skulls.mint{value: price}();
        assertNotEq(skulls.seeds(1), skulls.seeds(2));
    }

    function test_rarity_from_traits() public {
        vm.prank(alice);
        skulls.mint{value: price}();
        HashSkullsRenderer.Traits memory t = skulls.getTraits(1);
        uint8 expected = _computeRarityMirror(t);
        assertEq(t.rarity, expected);
    }

    // -------------------------------------------------------------------------
    // Transfer
    // -------------------------------------------------------------------------

    function test_transfer() public {
        vm.prank(alice);
        skulls.mint{value: price}();

        vm.prank(alice);
        skulls.transferFrom(alice, bob, 1);

        assertEq(skulls.ownerOf(1), bob);
        assertEq(skulls.balanceOf(alice), 0);
        assertEq(skulls.balanceOf(bob), 1);
        uint256[] memory aliceIds = skulls.tokensOfOwner(alice);
        uint256[] memory bobIds = skulls.tokensOfOwner(bob);
        assertEq(aliceIds.length, 0);
        assertEq(bobIds.length, 1);
        assertEq(bobIds[0], 1);
    }

    function test_approvedTransfer() public {
        vm.prank(alice);
        skulls.mint{value: price}();

        vm.prank(alice);
        skulls.approve(bob, 1);

        vm.prank(bob);
        skulls.transferFrom(alice, carol, 1);

        assertEq(skulls.ownerOf(1), carol);
    }

    // -------------------------------------------------------------------------
    // Sold out
    // -------------------------------------------------------------------------

    function test_soldOut() public {
        uint256 max = skulls.MAX_SUPPLY();
        // Set totalSupply to max-1 via storage slot (slot 0)
        vm.store(address(skulls), bytes32(uint256(0)), bytes32(max - 1));
        assertEq(skulls.totalSupply(), max - 1);

        vm.prank(alice);
        skulls.mint{value: price}();
        assertEq(skulls.totalSupply(), max);

        vm.prank(bob);
        vm.expectRevert(HashSkulls.SoldOut.selector);
        skulls.mint{value: price}();
    }

    // -------------------------------------------------------------------------
    // Wrap / Unwrap
    // -------------------------------------------------------------------------

    function test_wrap_unwrap() public {
        vm.prank(alice);
        skulls.mint{value: price}();

        vm.startPrank(alice);
        skulls.approve(address(wrapper), 1);
        wrapper.wrap(1);
        vm.stopPrank();

        assertEq(wrapper.ownerOf(1), alice);
        assertEq(wrapper.balanceOf(alice), 1);
        assertEq(wrapper.tokenOfOwnerByIndex(alice, 0), 1);
        uint256[] memory wrappedIds = wrapper.tokensOfOwner(alice);
        assertEq(wrappedIds.length, 1);
        assertEq(wrappedIds[0], 1);
        assertEq(skulls.ownerOf(1), address(wrapper));

        vm.prank(alice);
        wrapper.unwrap(1);

        assertEq(skulls.ownerOf(1), alice);
        assertEq(wrapper.balanceOf(alice), 0);
        wrappedIds = wrapper.tokensOfOwner(alice);
        assertEq(wrappedIds.length, 0);
        vm.expectRevert(HashSkullsWrapper.NotWrapped.selector);
        wrapper.ownerOf(1);
    }

    function test_wrapper_tokenURI_matches() public {
        vm.prank(alice);
        skulls.mint{value: price}();

        vm.startPrank(alice);
        skulls.approve(address(wrapper), 1);
        wrapper.wrap(1);
        vm.stopPrank();

        assertEq(skulls.tokenURI(1), wrapper.tokenURI(1));
    }

    function test_wrapper_doesNotSupportRoyalty() public view {
        assertFalse(wrapper.supportsInterface(0x2a55205a)); // ERC-2981
    }

    // -------------------------------------------------------------------------
    // Marketplace
    // -------------------------------------------------------------------------

    function test_market_list_buy() public {
        vm.prank(alice);
        skulls.mint{value: price}();

        uint256 listPrice = 0.1 ether;

        vm.startPrank(alice);
        skulls.approve(address(market), 1);
        market.list(1, listPrice);
        vm.stopPrank();

        (address seller, uint256 p) = market.getListing(1);
        assertEq(seller, alice);
        assertEq(p, listPrice);
        assertEq(market.activeListingCount(), 1);
        uint256[] memory activeIds = market.activeListingIds();
        assertEq(activeIds.length, 1);
        assertEq(activeIds[0], 1);

        uint256 aliceBefore = alice.balance;
        vm.prank(bob);
        market.buy{value: listPrice}(1);

        assertEq(skulls.ownerOf(1), bob);
        assertEq(alice.balance, aliceBefore + listPrice);
        assertEq(address(market).balance, 0);
        assertEq(market.activeListingCount(), 0);
        activeIds = market.activeListingIds();
        assertEq(activeIds.length, 0);
    }

    function test_market_cancel() public {
        vm.prank(alice);
        skulls.mint{value: price}();

        vm.startPrank(alice);
        skulls.approve(address(market), 1);
        market.list(1, 0.1 ether);
        market.cancel(1);
        vm.stopPrank();

        (address seller,) = market.getListing(1);
        assertEq(seller, address(0));
        assertEq(skulls.ownerOf(1), alice);
        assertEq(market.activeListingCount(), 0);
    }

    function test_market_buyPaysSellerDirectly() public {
        vm.prank(alice);
        skulls.mint{value: price}();

        uint256 listPrice = 0.1 ether;
        vm.startPrank(alice);
        skulls.approve(address(market), 1);
        market.list(1, listPrice);
        vm.stopPrank();

        uint256 aliceBefore = alice.balance;
        vm.prank(bob);
        market.buy{value: listPrice}(1);

        assertEq(alice.balance, aliceBefore + listPrice);
        assertEq(address(market).balance, 0);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    function _startsWith(string memory s, string memory prefix) internal pure returns (bool) {
        bytes memory sb = bytes(s);
        bytes memory pb = bytes(prefix);
        if (sb.length < pb.length) return false;
        for (uint256 i = 0; i < pb.length; i++) {
            if (sb[i] != pb[i]) return false;
        }
        return true;
    }

    function _computeRarityMirror(HashSkullsRenderer.Traits memory t) internal pure returns (uint8) {
        uint8 score = 0;
        if (t.accessory == 2) score += 4;
        else if (t.accessory == 1) score += 3;
        if (t.eyeType == 5) score += 3;
        else if (t.eyeType == 4) score += 2;
        if (t.bodyColor == 6) score += 2;
        if (t.crackPattern == 7) score += 3;
        else if (t.crackPattern == 6) score += 2;
        if (t.toothType == 1) score += 1;

        if (score >= 9) return 3;
        if (score >= 6) return 2;
        if (score >= 3) return 1;
        return 0;
    }
}
