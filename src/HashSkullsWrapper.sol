// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HashSkulls} from "./HashSkulls.sol";

/**
 * @title HashSkullsWrapper
 * @notice Wraps a native HashSkull into a standard ERC-721 for marketplace / pfp use.
 *
 * Flow:
 *   1. Owner approves wrapper on HashSkulls contract
 *   2. Owner calls wrap(tokenId) → native token transferred to wrapper, ERC-721 minted
 *   3. Owner calls unwrap(tokenId) → ERC-721 burned, native token returned
 *
 * The SVG/metadata is identical — wrapper delegates tokenURI to the native contract.
 */
contract HashSkullsWrapper {
    // -------------------------------------------------------------------------
    // ERC-721 storage
    // -------------------------------------------------------------------------

    HashSkulls public immutable native;

    string public constant name = "HashSkulls (Wrapped)";
    string public constant symbol = "wSKULL";

    mapping(uint256 => address) private _owner;
    mapping(uint256 => address) private _approved;
    mapping(address => uint256) private _balance;
    mapping(address => mapping(address => bool)) private _operatorApproval;
    mapping(address => uint256[]) private _ownedTokens;
    mapping(uint256 => uint256) private _ownedTokenIndexPlusOne;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    event Wrapped(uint256 indexed tokenId, address indexed by);
    event Unwrapped(uint256 indexed tokenId, address indexed by);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error NotOwner();
    error NotApproved();
    error InvalidToken();
    error AlreadyWrapped();
    error NotWrapped();
    error ZeroAddress();

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address nativeContract) {
        native = HashSkulls(payable(nativeContract));
    }

    // -------------------------------------------------------------------------
    // Wrap / Unwrap
    // -------------------------------------------------------------------------

    /**
     * @notice Lock a native HashSkull and mint a wrapped ERC-721.
     *         Caller must have approved this contract on the native HashSkulls contract first.
     */
    function wrap(uint256 tokenId) external {
        if (_owner[tokenId] != address(0)) revert AlreadyWrapped();

        // Pull native token from caller into this contract
        native.transferFrom(msg.sender, address(this), tokenId);

        _addTokenToOwner(msg.sender, tokenId);

        emit Transfer(address(0), msg.sender, tokenId);
        emit Wrapped(tokenId, msg.sender);
    }

    /**
     * @notice Burn the wrapped ERC-721 and return the native HashSkull.
     */
    function unwrap(uint256 tokenId) external {
        address owner = _wrappedOwnerOf(tokenId);
        if (msg.sender != owner && msg.sender != _approved[tokenId] && !_operatorApproval[owner][msg.sender]) {
            revert NotApproved();
        }

        _removeTokenFromOwner(owner, tokenId);
        delete _approved[tokenId];

        emit Transfer(owner, address(0), tokenId);
        emit Unwrapped(tokenId, msg.sender);

        // Return native token
        native.transferFrom(address(this), owner, tokenId);
    }

    // -------------------------------------------------------------------------
    // ERC-721 view
    // -------------------------------------------------------------------------

    function ownerOf(uint256 tokenId) external view returns (address) {
        return _wrappedOwnerOf(tokenId);
    }

    function balanceOf(address owner) external view returns (uint256) {
        if (owner == address(0)) revert ZeroAddress();
        return _balance[owner];
    }

    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256) {
        if (owner == address(0)) revert ZeroAddress();
        if (index >= _ownedTokens[owner].length) revert InvalidToken();
        return _ownedTokens[owner][index];
    }

    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        if (owner == address(0)) revert ZeroAddress();
        return _ownedTokens[owner];
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        _wrappedOwnerOf(tokenId); // reverts if not wrapped
        return native.tokenURI(tokenId);
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        _wrappedOwnerOf(tokenId);
        return _approved[tokenId];
    }

    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return _operatorApproval[owner][operator];
    }

    // -------------------------------------------------------------------------
    // ERC-721 mutations
    // -------------------------------------------------------------------------

    function approve(address to, uint256 tokenId) external {
        address owner = _wrappedOwnerOf(tokenId);
        if (msg.sender != owner && !_operatorApproval[owner][msg.sender]) revert NotApproved();
        _approved[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApproval[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        if (to == address(0)) revert ZeroAddress();
        address owner = _wrappedOwnerOf(tokenId);
        if (from != owner) revert NotOwner();
        if (msg.sender != owner && msg.sender != _approved[tokenId] && !_operatorApproval[owner][msg.sender]) {
            revert NotApproved();
        }

        _removeTokenFromOwner(from, tokenId);
        _addTokenToOwner(to, tokenId);
        delete _approved[tokenId];

        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata) external {
        transferFrom(from, to, tokenId);
    }

    // -------------------------------------------------------------------------
    // ERC-165 — ERC-721 + ERC-721Metadata
    // -------------------------------------------------------------------------

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x80ac58cd  // ERC-721
            || interfaceId == 0x5b5e139f  // ERC-721Metadata
            || interfaceId == 0x01ffc9a7; // ERC-165
    }

    // -------------------------------------------------------------------------
    // Internal
    // -------------------------------------------------------------------------

    function _wrappedOwnerOf(uint256 tokenId) internal view returns (address owner) {
        owner = _owner[tokenId];
        if (owner == address(0)) revert NotWrapped();
    }

    function _addTokenToOwner(address to, uint256 tokenId) internal {
        _owner[tokenId] = to;
        _balance[to]++;
        _ownedTokens[to].push(tokenId);
        _ownedTokenIndexPlusOne[tokenId] = _ownedTokens[to].length;
    }

    function _removeTokenFromOwner(address from, uint256 tokenId) internal {
        uint256 indexPlusOne = _ownedTokenIndexPlusOne[tokenId];
        if (indexPlusOne == 0) revert InvalidToken();

        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = _ownedTokens[from].length - 1;

        if (index != lastIndex) {
            uint256 lastTokenId = _ownedTokens[from][lastIndex];
            _ownedTokens[from][index] = lastTokenId;
            _ownedTokenIndexPlusOne[lastTokenId] = indexPlusOne;
        }

        _ownedTokens[from].pop();
        delete _ownedTokenIndexPlusOne[tokenId];
        delete _owner[tokenId];
        _balance[from]--;
    }
}
