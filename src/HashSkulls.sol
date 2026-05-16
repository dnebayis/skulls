// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HashSkullsRenderer} from "./HashSkullsRenderer.sol";

/**
 * @title  HashSkulls
 * @notice 10,000 fully-onchain pixel skull NFTs.
 *         Every trait derived from blockchain entropy — no artist, no randomness oracle.
 *         seed = keccak256((address(this) XOR blockhash(n-1)), (prevrandao XOR tokenId XOR sender))
 *
 *         Native semantics (NOT ERC-721). Wrap via HashSkullsWrapper for marketplace use.
 *         SVG generation is delegated to HashSkullsRenderer to stay under EIP-170 size limit.
 */
contract HashSkulls {

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    uint256 public constant MAX_SUPPLY      = 10_000;
    uint256 public constant MAX_PER_WALLET  = 3;
    uint256 public constant MINT_PRICE      = 0 ether;

    string public constant name   = "HashSkulls";
    string public constant symbol = "SKULL";

    // -------------------------------------------------------------------------
    // Storage
    // -------------------------------------------------------------------------

    address public immutable deployer;
    HashSkullsRenderer public immutable renderer;

    uint256 public totalSupply;

    mapping(uint256 => address)                     private _owner;
    mapping(uint256 => address)                     private _approved;
    mapping(address => uint256)                     private _balance;
    mapping(address => mapping(address => bool))    private _operatorApproval;
    mapping(uint256 => bytes32)                     public  seeds;
    mapping(address => uint256)                     public  mintCount;
    mapping(address => uint256[])                   private _ownedTokens;
    mapping(uint256 => uint256)                     private _ownedTokenIndexPlusOne;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    // Intentionally NOT the ERC-721 Transfer topic — prevents explorer mis-labelling.
    event SkullTransfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event Minted(uint256 indexed tokenId, address indexed minter, bytes32 seed);
    event Withdrawn(address indexed to, uint256 amount);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error NotOwner();
    error NotApproved();
    error InvalidToken();
    error SoldOut();
    error InsufficientPayment();
    error MintLimitReached();
    error TransferFailed();
    error ZeroAddress();
    error NothingToWithdraw();
    error InvalidQuantity();

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address _renderer) {
        deployer = msg.sender;
        renderer = HashSkullsRenderer(_renderer);
    }

    receive() external payable {}

    // -------------------------------------------------------------------------
    // Mint
    // -------------------------------------------------------------------------

    function mint() external payable returns (uint256 tokenId) {
        if (msg.value < MINT_PRICE)                  revert InsufficientPayment();
        tokenId = _mintOne(msg.sender);
    }

    function mintMany(uint256 quantity) external payable returns (uint256[] memory tokenIds) {
        if (quantity == 0 || quantity > MAX_PER_WALLET) revert InvalidQuantity();
        if (msg.value < MINT_PRICE * quantity) revert InsufficientPayment();

        tokenIds = new uint256[](quantity);
        for (uint256 i = 0; i < quantity; i++) {
            tokenIds[i] = _mintOne(msg.sender);
        }
    }

    function _mintOne(address to) internal returns (uint256 tokenId) {
        if (totalSupply >= MAX_SUPPLY)         revert SoldOut();
        if (mintCount[to] >= MAX_PER_WALLET)   revert MintLimitReached();

        tokenId = ++totalSupply;
        mintCount[to]++;

        bytes32 seed = keccak256(abi.encodePacked(
            bytes32(uint256(uint160(address(this)))) ^ blockhash(block.number - 1),
            bytes32(block.prevrandao) ^ bytes32(tokenId) ^ bytes32(uint256(uint160(to)))
        ));

        seeds[tokenId]  = seed;
        _addTokenToOwner(to, tokenId);

        emit SkullTransfer(address(0), to, tokenId);
        emit Minted(tokenId, to, seed);
    }

    // -------------------------------------------------------------------------
    // Withdraw (pull pattern)
    // -------------------------------------------------------------------------

    function withdraw() external {
        if (msg.sender != deployer) revert NotOwner();
        uint256 bal = address(this).balance;
        if (bal == 0) revert NothingToWithdraw();
        (bool ok,) = deployer.call{value: bal}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(deployer, bal);
    }

    // -------------------------------------------------------------------------
    // Ownership
    // -------------------------------------------------------------------------

    function ownerOf(uint256 tokenId) public view returns (address) {
        address o = _owner[tokenId];
        if (o == address(0)) revert InvalidToken();
        return o;
    }

    function balanceOf(address owner) public view returns (uint256) {
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

    // -------------------------------------------------------------------------
    // Approvals
    // -------------------------------------------------------------------------

    function approve(address to, uint256 tokenId) external {
        address owner = ownerOf(tokenId);
        if (msg.sender != owner && !_operatorApproval[owner][msg.sender]) revert NotApproved();
        _approved[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApproval[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function getApproved(uint256 tokenId) public view returns (address) {
        ownerOf(tokenId);
        return _approved[tokenId];
    }

    function isApprovedForAll(address owner, address operator) public view returns (bool) {
        return _operatorApproval[owner][operator];
    }

    // -------------------------------------------------------------------------
    // Transfer
    // -------------------------------------------------------------------------

    function transferFrom(address from, address to, uint256 tokenId) public {
        if (to == address(0)) revert ZeroAddress();
        address owner = ownerOf(tokenId);
        if (from != owner) revert NotOwner();
        if (msg.sender != owner && msg.sender != _approved[tokenId] && !_operatorApproval[owner][msg.sender])
            revert NotApproved();

        _removeTokenFromOwner(from, tokenId);
        _addTokenToOwner(to, tokenId);
        delete _approved[tokenId];

        emit SkullTransfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata) external {
        transferFrom(from, to, tokenId);
    }

    // -------------------------------------------------------------------------
    // Metadata — delegated to renderer
    // -------------------------------------------------------------------------

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        if (_owner[tokenId] == address(0)) revert InvalidToken();
        return renderer.render(tokenId, seeds[tokenId]);
    }

    function getTraits(uint256 tokenId) external view returns (HashSkullsRenderer.Traits memory) {
        if (_owner[tokenId] == address(0)) revert InvalidToken();
        return renderer.decodeTraits(seeds[tokenId]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    function mintsRemaining(address wallet) external view returns (uint256) {
        uint256 used = mintCount[wallet];
        return used >= MAX_PER_WALLET ? 0 : MAX_PER_WALLET - used;
    }

    // -------------------------------------------------------------------------
    // ERC-165 — NOT claiming ERC-721
    // -------------------------------------------------------------------------

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7; // ERC-165 only
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
        _balance[from]--;
    }
}
