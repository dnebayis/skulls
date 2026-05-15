// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HashSkulls} from "./HashSkulls.sol";

/**
 * @title HashSkullsMarket
 * @notice Peer-to-peer marketplace for native HashSkulls.
 *         Sale value is paid directly to the seller in the buy transaction.
 *
 * Flow:
 *   Seller: approve(market, tokenId) → list(tokenId, price)
 *   Buyer:  buy{value: price}(tokenId)
 *   Seller: cancel(tokenId) to delist
 */
contract HashSkullsMarket {
    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    HashSkulls public immutable skulls;

    struct Listing {
        address seller;
        uint256 price;
    }

    mapping(uint256 => Listing) public listings;
    uint256 public activeListingCount;

    uint256[] private _activeListingIds;
    mapping(uint256 => uint256) private _activeListingIndexPlusOne;

    uint256 private _locked = 1; // reentrancy guard

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event Sold(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price);
    event Cancelled(uint256 indexed tokenId, address indexed seller);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error NotListed();
    error AlreadyListed();
    error InsufficientPayment();
    error NotSeller();
    error PriceTooLow();
    error TransferFailed();
    error Reentrant();

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier nonReentrant() {
        if (_locked != 1) revert Reentrant();
        _locked = 2;
        _;
        _locked = 1;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address _skulls) {
        skulls = HashSkulls(payable(_skulls));
    }

    // -------------------------------------------------------------------------
    // List
    // -------------------------------------------------------------------------

    function list(uint256 tokenId, uint256 price) external {
        if (listings[tokenId].seller != address(0)) revert AlreadyListed();
        if (price == 0) revert PriceTooLow();

        // Pull token from seller (requires prior approve)
        skulls.transferFrom(msg.sender, address(this), tokenId);

        listings[tokenId] = Listing({ seller: msg.sender, price: price });
        _addActiveListing(tokenId);
        emit Listed(tokenId, msg.sender, price);
    }

    // -------------------------------------------------------------------------
    // Buy
    // -------------------------------------------------------------------------

    function buy(uint256 tokenId) external payable nonReentrant {
        Listing memory l = listings[tokenId];
        if (l.seller == address(0))  revert NotListed();
        if (msg.value < l.price)     revert InsufficientPayment();

        uint256 refund = msg.value - l.price;

        // Effects before interactions
        delete listings[tokenId];
        _removeActiveListing(tokenId);
        // Transfer skull to buyer
        skulls.transferFrom(address(this), msg.sender, tokenId);

        // Pay seller immediately. Reverts the whole purchase if the payout fails.
        (bool paid,) = l.seller.call{value: l.price}("");
        if (!paid) revert TransferFailed();

        // Refund excess ETH to buyer
        if (refund > 0) {
            (bool ok,) = msg.sender.call{value: refund}("");
            if (!ok) revert TransferFailed();
        }

        emit Sold(tokenId, msg.sender, l.seller, l.price);
    }

    // -------------------------------------------------------------------------
    // Cancel
    // -------------------------------------------------------------------------

    function cancel(uint256 tokenId) external {
        Listing memory l = listings[tokenId];
        if (l.seller == address(0)) revert NotListed();
        if (l.seller != msg.sender) revert NotSeller();

        delete listings[tokenId];
        _removeActiveListing(tokenId);
        skulls.transferFrom(address(this), msg.sender, tokenId);
        emit Cancelled(tokenId, msg.sender);
    }

    // -------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------

    function getListing(uint256 tokenId) external view returns (address seller, uint256 price) {
        Listing memory l = listings[tokenId];
        return (l.seller, l.price);
    }

    function activeListingIds() external view returns (uint256[] memory) {
        return _activeListingIds;
    }

    // -------------------------------------------------------------------------
    // Internal listing set
    // -------------------------------------------------------------------------

    function _addActiveListing(uint256 tokenId) internal {
        _activeListingIds.push(tokenId);
        _activeListingIndexPlusOne[tokenId] = _activeListingIds.length;
        activeListingCount++;
    }

    function _removeActiveListing(uint256 tokenId) internal {
        uint256 indexPlusOne = _activeListingIndexPlusOne[tokenId];
        if (indexPlusOne == 0) return;

        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = _activeListingIds.length - 1;

        if (index != lastIndex) {
            uint256 lastTokenId = _activeListingIds[lastIndex];
            _activeListingIds[index] = lastTokenId;
            _activeListingIndexPlusOne[lastTokenId] = indexPlusOne;
        }

        _activeListingIds.pop();
        delete _activeListingIndexPlusOne[tokenId];
        activeListingCount--;
    }

    receive() external payable {}
}
